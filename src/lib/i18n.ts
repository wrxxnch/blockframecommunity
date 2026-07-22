import { useState, useEffect } from "react";

export type Language = "pt" | "en";

export interface Translations {
  // Navigation & Header
  siteTitle: string;
  siteSubtitle: string;
  navGallery: string;
  navPublish: string;
  navHelp: string;
  statsTotalFiles: string;
  statsBuilders: string;
  statsLikes: string;
  
  // Language Selector
  langName: string;

  // Hero Section
  heroBadge: string;
  heroTitle1: string;
  heroTitleHighlight: string;
  heroTitle2: string;
  heroDescription: string;
  btnPublish: string;
  btnExplore: string;
  ingameLoading: string;

  // Google Sheets Panel
  sheetsTitle: string;
  sheetsDescription: string;
  btnGoogleLogin: string;
  btnSaveSheet: string;
  btnLoadSheet: string;
  btnOpenSheet: string;
  savingSheet: string;
  loadingSheet: string;
  accountConnected: string;

  // Upload Form
  uploadTitle: string;
  uploadSubtitle: string;
  fieldTitle: string;
  fieldTitlePlaceholder: string;
  fieldAuthor: string;
  fieldAuthorPlaceholder: string;
  fieldCategory: string;
  fieldTags: string;
  fieldTagsPlaceholder: string;
  fieldDescription: string;
  fieldDescriptionPlaceholder: string;
  fieldPasscode: string;
  fieldPasscodePlaceholder: string;
  fieldPasscodeHelp: string;
  fieldBfFile: string;
  dragBfHere: string;
  orClickToSelect: string;
  fileSelected: string;
  fieldCoverImage: string;
  dragImageHere: string;
  btnSubmitPublish: string;
  publishing: string;

  // Gallery Section
  galleryTitle: string;
  gallerySubtitle: string;
  tabExplore: string;
  tabProfile: string;
  tabCreations: string;
  tabLikes: string;
  searchPlaceholder: string;
  sortBy: string;
  sortNewest: string;
  sortOldest: string;
  sortLikes: string;
  sortAlphabetical: string;
  filterCategory: string;
  catAll: string;
  catHouse: string;
  catDecor: string;
  catRedstone: string;
  catFarm: string;
  catStatue: string;
  catTree: string;
  catVehicle: string;
  catPixelArt: string;
  catOther: string;
  noPostsFound: string;
  noPostsDesc: string;
  authorLabel: string;
  noImage: string;
  copyCmd: string;
  copied: string;
  btnDownload: string;
  downloading: string;
  btnDelete: string;
  btnConfigBf: string;

  // .bf Configurator Modal / Tab
  bfModalTitle: string;
  bfModalSubtitle: string;
  bfSelectAll: string;
  bfDeselectAll: string;
  bfItemsActive: string;
  bfSearchItems: string;
  bfItemName: string;
  bfItemIndex: string;
  bfDownloadCustom: string;
  bfNoItemsFound: string;
  bfCloseModal: string;

  // Help Section
  helpTitle: string;
  helpSubtitle: string;
  step1Title: string;
  step1Desc: string;
  step2Title: string;
  step2Desc: string;
  step3Title: string;
  step3Desc: string;
  footerNotice: string;
}

export const translations: Record<Language, Translations> = {
  pt: {
    siteTitle: "BLOCKFRAME",
    siteSubtitle: "Acervo Comunitário · Mineclonia / Minetest",
    navGallery: "Galeria",
    navPublish: "Publicar",
    navHelp: "Ajuda",
    statsTotalFiles: "Acervo Total",
    statsBuilders: "Construtores",
    statsLikes: "Curtidas",
    langName: "Português",

    heroBadge: "Projeto Comunitário Oficial-Fansite",
    heroTitle1: "Suas construções em ",
    heroTitleHighlight: ".bf",
    heroTitle2: ", prontas pra qualquer mundo!",
    heroDescription:
      "O BlockFrame permite exportar e carregar porções do mapa instantaneamente no Mineclonia ou Minetest. Use esta galeria para compartilhar esquemas, personalizar itens de arquivos e fazer backups confiáveis.",
    btnPublish: "PUBLICAR ESTRUTURA",
    btnExplore: "EXPLORAR GALERIA",
    ingameLoading: "Carregamento in-game:",

    sheetsTitle: "Sincronização Google Sheets",
    sheetsDescription:
      "Conecte sua conta do Google para utilizar o Google Sheets como banco de dados em tempo real ou backup de segurança! Seus mundos e construções estarão sempre salvos e acessíveis.",
    btnGoogleLogin: "ENTRAR COM GOOGLE",
    btnSaveSheet: "SALVAR PLANILHA",
    btnLoadSheet: "CARREGAR PLANILHA",
    btnOpenSheet: "ABRIR PLANILHA",
    savingSheet: "SALVANDO...",
    loadingSheet: "IMPORTANDO...",
    accountConnected: "CONTA CONECTADA",

    uploadTitle: "PUBLICAR CONSTRUÇÃO (.BF)",
    uploadSubtitle: "Envie seus esquemas do BlockFrame para a comunidade.",
    fieldTitle: "Título da Construção",
    fieldTitlePlaceholder: "Ex: Castelo Medieval de Pedra",
    fieldAuthor: "Nome do Construtor",
    fieldAuthorPlaceholder: "Seu nick no jogo",
    fieldCategory: "Categoria",
    fieldTags: "Tags (separadas por vírgula)",
    fieldTagsPlaceholder: "medievais, pedra, castelo, fortificação",
    fieldDescription: "Descrição Detalhada",
    fieldDescriptionPlaceholder: "Descreva os blocos utilizados, dimensões e dicas de montagem...",
    fieldPasscode: "Código de Gerenciamento (Senha)",
    fieldPasscodePlaceholder: "Crie uma senha simples (ex: 1234)",
    fieldPasscodeHelp: "Guarde essa senha para poder excluir ou atualizar seu arquivo no futuro.",
    fieldBfFile: "Arquivo de Estrutura (.bf)",
    dragBfHere: "Arraste o arquivo .bf aqui",
    orClickToSelect: "ou clique para selecionar no computador",
    fileSelected: "Arquivo .bf Selecionado",
    fieldCoverImage: "Imagem de Capa (Opcional)",
    dragImageHere: "Arraste uma foto da construção",
    btnSubmitPublish: "PUBLICAR NO ACERVO",
    publishing: "PUBLICANDO...",

    galleryTitle: "GALERIA DE CONSTRUÇÕES",
    gallerySubtitle:
      "Navegue pelas criações dos jogadores, curta, personalize e faça o download do arquivo .bf para importar no seu servidor.",
    tabExplore: "🔍 Explorar Acervo",
    tabProfile: "👤 Meu Perfil",
    tabCreations: "Minhas Criações",
    tabLikes: "Minhas Curtidas",
    searchPlaceholder: "Buscar por título, autor ou tag...",
    sortBy: "Ordenar por",
    sortNewest: "Mais Recentes",
    sortOldest: "Mais Antigos",
    sortLikes: "Mais Curtidos",
    sortAlphabetical: "Alfabética (A-Z)",
    filterCategory: "Filtrar por Categoria:",
    catAll: "Todas",
    catHouse: "Casa",
    catDecor: "Decoração",
    catRedstone: "Redstone",
    catFarm: "Fazenda",
    catStatue: "Estátua",
    catTree: "Árvore/Flora",
    catVehicle: "Veículo",
    catPixelArt: "Pixel Art",
    catOther: "Outro",
    noPostsFound: "NENHUM ARQUIVO REGISTRADO",
    noPostsDesc:
      "Não encontramos nenhum resultado correspondente ao filtro. Que tal ser o primeiro a publicar um arquivo nesta categoria?",
    authorLabel: "Autor:",
    noImage: "Sem foto",
    copyCmd: "Copiar",
    copied: "Copiado",
    btnDownload: "BAIXAR",
    downloading: "BAIXANDO...",
    btnDelete: "Excluir",
    btnConfigBf: "EDITAR ITENS .BF",

    bfModalTitle: "CONFIGURADOR DE ITENS DO ARQUIVO .BF",
    bfModalSubtitle:
      "Marque ou desmarque os blocos/itens que você deseja manter ou remover do arquivo antes de baixar.",
    bfSelectAll: "Ativar Todos",
    bfDeselectAll: "Remover Todos",
    bfItemsActive: "itens ativos de",
    bfSearchItems: "Filtrar por nome de bloco ou item...",
    bfItemName: "Bloco / Item",
    bfItemIndex: "Índice",
    bfDownloadCustom: "BAIXAR .BF PERSONALIZADO",
    bfNoItemsFound: "Nenhum item/bloco encontrado no arquivo.",
    bfCloseModal: "Fechar",

    helpTitle: "COMO USAR O BLOCKFRAME NO MINECLONIA",
    helpSubtitle: "Guia passo a passo para exportar, enviar e carregar suas estruturas no jogo.",
    step1Title: "1. Como salvar no jogo (/blockframe_save)",
    step1Desc:
      "No jogo, selecione a área desejada com a varinha do BlockFrame e execute `/blockframe_save nome_do_arquivo`. O arquivo `.bf` será gerado na pasta do mod no seu servidor ou cliente.",
    step2Title: "2. Publicar no Acervo Comunitário",
    step2Desc:
      "Envie o arquivo `.bf` gerado usando o formulário acima, adicione um título e uma foto de capa para que outros jogadores possam ver e baixar.",
    step3Title: "3. Carregar e personalizar (/blockframe_load)",
    step3Desc:
      "Baixe o arquivo `.bf` completo ou personalize quais itens deseja manter usando nossa ferramenta interativa. Coloque o arquivo na pasta `schematics` e digite `/blockframe_load nome_do_arquivo` no jogo.",
    footerNotice:
      "Acervo não-oficial de construções para o mod BlockFrame disponível no Mineclonia / Minetest.",
  },
  en: {
    siteTitle: "BLOCKFRAME",
    siteSubtitle: "Community Archive · Mineclonia / Minetest",
    navGallery: "Gallery",
    navPublish: "Publish",
    navHelp: "Help",
    statsTotalFiles: "Total Files",
    statsBuilders: "Builders",
    statsLikes: "Likes",
    langName: "English",

    heroBadge: "Official Fan-Community Project",
    heroTitle1: "Your builds in ",
    heroTitleHighlight: ".bf",
    heroTitle2: ", ready for any world!",
    heroDescription:
      "BlockFrame allows exporting and loading map sections instantly in Mineclonia or Minetest. Use this gallery to share schematics, customize file items, and perform reliable backups.",
    btnPublish: "PUBLISH STRUCTURE",
    btnExplore: "EXPLORE GALLERY",
    ingameLoading: "In-game command:",

    sheetsTitle: "Google Sheets Sync",
    sheetsDescription:
      "Connect your Google account to use Google Sheets as a real-time database or cloud backup! Your worlds and builds will always be safe and accessible.",
    btnGoogleLogin: "SIGN IN WITH GOOGLE",
    btnSaveSheet: "SAVE TO SHEET",
    btnLoadSheet: "LOAD FROM SHEET",
    btnOpenSheet: "OPEN SHEET",
    savingSheet: "SAVING...",
    loadingSheet: "IMPORTING...",
    accountConnected: "ACCOUNT CONNECTED",

    uploadTitle: "PUBLISH BUILD (.BF)",
    uploadSubtitle: "Upload your BlockFrame schematics for the community.",
    fieldTitle: "Build Title",
    fieldTitlePlaceholder: "e.g. Medieval Stone Castle",
    fieldAuthor: "Builder Nickname",
    fieldAuthorPlaceholder: "Your in-game name",
    fieldCategory: "Category",
    fieldTags: "Tags (comma separated)",
    fieldTagsPlaceholder: "medieval, stone, castle, fort",
    fieldDescription: "Detailed Description",
    fieldDescriptionPlaceholder: "Describe blocks used, dimensions, assembly tips...",
    fieldPasscode: "Management Code (Passcode)",
    fieldPasscodePlaceholder: "Create a simple password (e.g. 1234)",
    fieldPasscodeHelp: "Keep this password to update or delete your post in the future.",
    fieldBfFile: "Structure File (.bf)",
    dragBfHere: "Drag .bf file here",
    orClickToSelect: "or click to select from computer",
    fileSelected: ".bf File Selected",
    fieldCoverImage: "Cover Image (Optional)",
    dragImageHere: "Drag a photo of your build",
    btnSubmitPublish: "PUBLISH TO ARCHIVE",
    publishing: "PUBLISHING...",

    galleryTitle: "BUILDS GALLERY",
    gallerySubtitle:
      "Browse player creations, like, customize items, and download .bf files to import on your server.",
    tabExplore: "🔍 Explore Archive",
    tabProfile: "👤 My Profile",
    tabCreations: "My Creations",
    tabLikes: "My Likes",
    searchPlaceholder: "Search by title, author, or tag...",
    sortBy: "Sort by",
    sortNewest: "Newest",
    sortOldest: "Oldest",
    sortLikes: "Most Liked",
    sortAlphabetical: "Alphabetical (A-Z)",
    filterCategory: "Filter by Category:",
    catAll: "All",
    catHouse: "House",
    catDecor: "Decoration",
    catRedstone: "Redstone",
    catFarm: "Farm",
    catStatue: "Statue",
    catTree: "Tree/Flora",
    catVehicle: "Vehicle",
    catPixelArt: "Pixel Art",
    catOther: "Other",
    noPostsFound: "NO FILES RECORDED",
    noPostsDesc:
      "No matching records found for your filter. How about being the first to publish a build in this category?",
    authorLabel: "Author:",
    noImage: "No photo",
    copyCmd: "Copy",
    copied: "Copied",
    btnDownload: "DOWNLOAD",
    downloading: "DOWNLOADING...",
    btnDelete: "Delete",
    btnConfigBf: "EDIT .BF ITEMS",

    bfModalTitle: ".BF FILE ITEM CONFIGURATOR",
    bfModalSubtitle:
      "Check or uncheck the blocks/items you want to keep or remove from the file before downloading.",
    bfSelectAll: "Select All",
    bfDeselectAll: "Deselect All",
    bfItemsActive: "active items out of",
    bfSearchItems: "Filter by block or item name...",
    bfItemName: "Block / Item",
    bfItemIndex: "Index",
    bfDownloadCustom: "DOWNLOAD CUSTOM .BF",
    bfNoItemsFound: "No blocks/items found inside this file.",
    bfCloseModal: "Close",

    helpTitle: "HOW TO USE BLOCKFRAME IN MINECLONIA",
    helpSubtitle: "Step-by-step guide to export, publish, and load your structures in-game.",
    step1Title: "1. How to save in-game (/blockframe_save)",
    step1Desc:
      "In-game, select the desired area with the BlockFrame wand and run `/blockframe_save file_name`. The `.bf` file will be generated in your mod folder.",
    step2Title: "2. Publish to Community Archive",
    step2Desc:
      "Upload the generated `.bf` file using the form above, add a title and cover photo so other players can view and download it.",
    step3Title: "3. Load and customize (/blockframe_load)",
    step3Desc:
      "Download the complete `.bf` file or customize which items to keep using our interactive editor. Put the file in your `schematics` folder and type `/blockframe_load file_name` in-game.",
    footerNotice:
      "Unofficial build archive for the BlockFrame mod available in Mineclonia / Minetest.",
  },
};

const LANG_STORAGE_KEY = "blockframe_user_lang";

export function useLanguage() {
  const [lang, setLang] = useState<Language>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(LANG_STORAGE_KEY) as Language;
      if (saved === "pt" || saved === "en") return saved;
    }
    return "en";
  });

  const toggleLanguage = () => {
    const nextLang: Language = lang === "pt" ? "en" : "pt";
    setLang(nextLang);
    if (typeof window !== "undefined") {
      localStorage.setItem(LANG_STORAGE_KEY, nextLang);
    }
  };

  const changeLanguage = (newLang: Language) => {
    setLang(newLang);
    if (typeof window !== "undefined") {
      localStorage.setItem(LANG_STORAGE_KEY, newLang);
    }
  };

  return {
    lang,
    t: translations[lang],
    toggleLanguage,
    changeLanguage,
  };
}
