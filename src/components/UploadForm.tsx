import React, { useState, useRef, useEffect } from "react";
import { Hammer, Tag, Folder, Sparkles, HelpCircle, FileText, Key, Check } from "lucide-react";
import { CATEGORIES, Category } from "../types";
import { createPost } from "../lib/api";
import { auth } from "../lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { useLanguage } from "../lib/i18n";

interface UploadFormProps {
  onSuccess: () => void;
}

export default function UploadForm({ onSuccess }: UploadFormProps) {
  const { t } = useLanguage();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [category, setCategory] = useState<Category>("Casa");
  const [tagsInput, setTagsInput] = useState("");
  const [description, setDescription] = useState("");
  const [passcode, setPasscode] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user && user.displayName) {
        setAuthor(user.displayName);
      }
    });
    return () => unsubscribe();
  }, []);

  const [file, setFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [dragOver, setDragOver] = useState(false);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageBase64, setImageBase64] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ message: string; success: boolean } | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const processFile = async (selectedFile: File) => {
    if (!selectedFile.name.toLowerCase().endsWith(".bf")) {
      setStatus({
        message: "Erro: O arquivo precisa ter a extensão '.bf' (gerado pelo comando /blockframe_save).",
        success: false,
      });
      return;
    }

    if (selectedFile.size > 8 * 1024 * 1024) {
      setStatus({
        message: "Erro: O arquivo excede o limite de tamanho máximo de 8 MB.",
        success: false,
      });
      return;
    }

    try {
      const content = await selectedFile.text();
      setFile(selectedFile);
      setFileContent(content);
      setStatus(null); // Clear errors
    } catch (err) {
      setStatus({
        message: "Erro ao ler o conteúdo do arquivo .bf.",
        success: false,
      });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      processFile(droppedFile);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (selected.size > 2 * 1024 * 1024) {
        alert("A imagem de capa deve ter no máximo 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageFile(selected);
        setImageBase64(reader.result as string);
      };
      reader.readAsDataURL(selected);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file || !fileContent) {
      setStatus({ message: "Por favor, selecione um arquivo .bf antes de publicar.", success: false });
      return;
    }

    setLoading(true);
    setStatus({ message: "Salvando estrutura no acervo...", success: true });

    try {
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      const sizeKb = Math.max(1, Math.round(file.size / 1024));

      const newPost = await createPost({
        title,
        author,
        authorUid: currentUser?.uid,
        authorEmail: currentUser?.email || undefined,
        category,
        tags,
        description,
        filename: file.name,
        sizeKb,
        passcode,
        content: fileContent,
        imageUrl: imageBase64 || undefined,
      });

      // Track creations locally
      const createdIds = JSON.parse(localStorage.getItem("blockframe_my_created_ids") || "[]");
      if (newPost && newPost.id) {
        createdIds.push(newPost.id);
        localStorage.setItem("blockframe_my_created_ids", JSON.stringify(createdIds));

        if (currentUser) {
          const userCreations = JSON.parse(localStorage.getItem(`my_creations_${currentUser.uid}`) || "[]");
          userCreations.push(newPost.id);
          localStorage.setItem(`my_creations_${currentUser.uid}`, JSON.stringify(userCreations));
        }
      }

      setStatus({
        message: "Construção publicada com sucesso na galeria!",
        success: true,
      });

      // Clear form
      setTitle("");
      setAuthor("");
      setCategory("Casa");
      setTagsInput("");
      setDescription("");
      setPasscode("");
      setFile(null);
      setFileContent("");
      setImageFile(null);
      setImageBase64("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (imageInputRef.current) imageInputRef.current.value = "";

      // Refresh list
      onSuccess();

      // Scroll to gallery
      setTimeout(() => {
        document.getElementById("galeria")?.scrollIntoView({ behavior: "smooth" });
      }, 1000);
    } catch (err: any) {
      setStatus({
        message: err.message || "Erro ao publicar arquivo.",
        success: false,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="enviar" className="max-w-4xl mx-auto py-10 px-4">
      {/* Head section */}
      <div className="flex items-center gap-3 mb-6 border-b-4 border-black pb-3">
        <div className="bg-mc-green p-2 rounded-sm outline outline-2 outline-black flex-none">
          <Hammer className="w-5 h-5 text-white" />
        </div>
        <div>
          <span className="text-[10px] font-pixel text-mc-emerald">ETAPA 01 &middot; ENVIAR ESTRUTURA</span>
          <h2 className="text-xl md:text-2xl text-white font-pixel mt-0.5 drop-shadow-[2px_2px_0px_rgba(0,0,0,0.8)]">
            {t.uploadTitle}
          </h2>
        </div>
      </div>

      {/* Main Crafting Block Panel */}
      <form onSubmit={handleSubmit} className="mc-wood-panel p-6 md:p-8 rounded-sm shadow-2xl relative">
        {/* Ribbon decoration */}
        <div className="absolute -top-4 left-6 bg-mc-gold text-neutral-900 font-pixel text-[8px] md:text-[10px] px-3 py-1.5 outline outline-2 outline-black font-bold tracking-wider rounded-sm">
          {t.uploadSubtitle}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
          {/* Title */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-pixel text-mc-gold tracking-wide flex items-center gap-1.5" htmlFor="title">
              <span>{t.fieldTitle}</span>
            </label>
            <input
              id="title"
              type="text"
              required
              maxLength={60}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t.fieldTitlePlaceholder}
              className="mc-input w-full"
            />
          </div>

          {/* Author */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-pixel text-mc-gold tracking-wide flex items-center gap-1.5" htmlFor="author">
              <span>{t.fieldAuthor}</span>
            </label>
            <input
              id="author"
              type="text"
              required
              maxLength={30}
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder={t.fieldAuthorPlaceholder}
              className="mc-input w-full"
            />
          </div>

          {/* Category selection */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-pixel text-mc-gold tracking-wide flex items-center gap-1.5" htmlFor="category">
              <Folder className="w-3.5 h-3.5" />
              <span>{t.fieldCategory}</span>
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              className="mc-input w-full cursor-pointer bg-neutral-900 border-neutral-700"
            >
              {CATEGORIES.filter((c) => c !== "Todas").map((cat) => (
                <option key={cat} value={cat} className="bg-neutral-900 text-white">
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Tags */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-pixel text-mc-gold tracking-wide flex items-center gap-1.5" htmlFor="tags">
              <Tag className="w-3.5 h-3.5" />
              <span>{t.fieldTags}</span>
            </label>
            <input
              id="tags"
              type="text"
              maxLength={80}
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder={t.fieldTagsPlaceholder}
              className="mc-input w-full"
            />
          </div>

          {/* Description */}
          <div className="md:col-span-2 flex flex-col gap-2">
            <label className="text-xs font-pixel text-mc-gold tracking-wide flex items-center gap-1.5" htmlFor="description">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{t.fieldDescription}</span>
            </label>
            <textarea
              id="description"
              maxLength={400}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t.fieldDescriptionPlaceholder}
              rows={3}
              className="mc-input w-full h-24 resize-none"
            />
          </div>

          {/* File Drop Drag Area */}
          <div className="md:col-span-2 flex flex-col gap-2">
            <label className="text-xs font-pixel text-mc-gold tracking-wide flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              <span>{t.fieldBfFile}</span>
            </label>

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-4 border-dashed rounded-sm p-6 text-center cursor-pointer transition duration-150 ${
                dragOver
                  ? "border-mc-diamond bg-cyan-950 bg-opacity-30"
                  : file
                  ? "border-mc-emerald bg-emerald-950 bg-opacity-20"
                  : "border-neutral-600 bg-neutral-950 bg-opacity-45 hover:border-mc-gold"
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept=".bf"
                className="hidden"
              />

              {!file ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 bg-neutral-900 border-2 border-neutral-700 flex items-center justify-center text-neutral-400">
                    <FileText className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-mono text-neutral-300">
                    {t.dragBfHere}
                  </p>
                  <span className="text-[10px] font-mono text-neutral-500">
                    {t.orClickToSelect}
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 bg-mc-green border-2 border-mc-emerald flex items-center justify-center text-white rounded-sm">
                    <Check className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-pixel text-mc-emerald">{t.fileSelected}</p>
                  <b className="font-mono text-xs text-white bg-black bg-opacity-40 px-3 py-1 rounded-sm border border-neutral-800">
                    {file.name}
                  </b>
                  <span className="text-[10px] font-mono text-neutral-400">
                    Size: {Math.max(1, Math.round(file.size / 1024))} KB
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Image Cover upload */}
          <div className="md:col-span-2 flex flex-col gap-2">
            <label className="text-xs font-pixel text-mc-gold tracking-wide flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{t.fieldCoverImage}</span>
            </label>

            <div
              onClick={() => imageInputRef.current?.click()}
              className="border-4 border-dashed rounded-sm p-4 text-center cursor-pointer transition duration-150 border-neutral-600 bg-neutral-950 bg-opacity-45 hover:border-mc-gold flex flex-col items-center justify-center min-h-[120px]"
            >
              <input
                type="file"
                ref={imageInputRef}
                onChange={handleImageSelect}
                accept="image/*"
                className="hidden"
              />

              {!imageFile ? (
                <div className="flex flex-col items-center gap-1.5">
                  <span className="text-xs font-mono text-neutral-300">
                    {t.dragImageHere}
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <img
                    src={imageBase64}
                    alt="Preview da Capa"
                    className="w-32 h-20 object-cover border-2 border-black outline outline-1 outline-neutral-400"
                  />
                  <p className="text-xs font-pixel text-mc-emerald">{t.fileSelected}</p>
                  <span className="text-[10px] font-mono text-neutral-400">{imageFile.name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Passcode */}
          <div className="md:col-span-2 flex flex-col gap-2">
            <label className="text-xs font-pixel text-mc-gold tracking-wide flex items-center gap-1.5" htmlFor="passcode">
              <Key className="w-3.5 h-3.5" />
              <span>{t.fieldPasscode}</span>
            </label>
            <input
              id="passcode"
              type="password"
              required
              maxLength={20}
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder={t.fieldPasscodePlaceholder}
              className="mc-input w-full"
            />
            <span className="text-[10px] font-mono text-neutral-400 leading-relaxed flex items-start gap-1">
              <HelpCircle className="w-3.5 h-3.5 text-mc-gold flex-none mt-0.5" />
              <span>{t.fieldPasscodeHelp}</span>
            </span>
          </div>
        </div>

        {/* Message Status */}
        {status && (
          <div
            className={`border-4 border-black p-4 mt-6 font-mono text-xs shadow-md ${
              status.success
                ? "bg-neutral-800 text-mc-emerald border-mc-emerald"
                : "bg-red-950 text-red-200 border-red-700"
            }`}
          >
            {status.message}
          </div>
        )}

        {/* Actions bar */}
        <div className="mt-8 pt-4 border-t border-neutral-800 flex flex-col sm:flex-row justify-between items-center gap-4">
          <span className="text-[10px] font-mono text-neutral-400 max-w-sm text-center sm:text-left">
            BlockFrame .bf schematic archive
          </span>
          <button
            type="submit"
            disabled={loading}
            className="mc-button mc-button-green w-full sm:w-auto"
          >
            {loading ? t.publishing : t.btnSubmitPublish}
          </button>
        </div>
      </form>
    </div>
  );
}
