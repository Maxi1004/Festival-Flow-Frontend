export type TalentAvailabilityStatus = "Disponible" | "Ocupado" | "Disponible pronto";
export type TalentApplicationStatus =
  | "Enviada"
  | "En revision"
  | "Preseleccionado"
  | "Aceptado"
  | "Rechazado";

export type TalentProfileData = {
  name: string;
  mainSpecialty: string;
  location: string;
  availabilityStatus: TalentAvailabilityStatus;
  profileCompletion: number;
  bio: string;
  experienceYears: number;
  specialties: string[];
  languages: string[];
  skills: string[];
  availability: {
    travel: string;
    modality: string;
    workLocation: string;
    availableFrom: string;
    notes: string;
  };
  portfolio: Array<{
    label: string;
    description: string;
    href: string;
  }>;
  featuredExperience: Array<{
    project: string;
    role: string;
    year: string;
    description: string;
  }>;
};

export type TalentOpportunity = {
  id: string;
  projectName: string;
  productionType: string;
  role: string;
  location: string;
  modality: string;
  description: string;
  urgency: string;
};

export type TalentApplication = {
  id: string;
  projectName: string;
  role: string;
  appliedAt: string;
  status: TalentApplicationStatus;
  message: string;
};

export const talentProfileMock: TalentProfileData = {
  name: "Camila Rojas",
  mainSpecialty: "Actriz y creadora audiovisual",
  location: "Santiago, Chile",
  availabilityStatus: "Disponible",
  profileCompletion: 85,
  bio:
    "Interprete audiovisual con experiencia en ficcion, publicidad y contenidos digitales. Combino actuacion frente a camara con una mirada colaborativa en rodaje y desarrollo creativo.",
  experienceYears: 8,
  specialties: ["Actor", "Camarografa", "Directora de fotografia"],
  languages: ["Espanol nativo", "Ingles profesional", "Portugues conversacional"],
  skills: ["Casting self-tape", "DaVinci Resolve", "Adobe Premiere", "Direccion de actores"],
  availability: {
    travel: "Disponible para viajar dentro y fuera del pais.",
    modality: "Freelance y por proyecto",
    workLocation: "Presencial, remota o esquema hibrido",
    availableFrom: "15 de abril de 2026",
    notes:
      "Disponible para rodajes de media y larga duracion. Interes en proyectos de ficcion, documental y branded content.",
  },
  portfolio: [
    {
      label: "Reel actoral",
      description: "Seleccion de escenas para ficcion y comercial.",
      href: "#",
    },
    {
      label: "Videobook",
      description: "Presentacion audiovisual actualizada para casting.",
      href: "#",
    },
    {
      label: "Portafolio web",
      description: "Trabajos recientes, fotografias y materiales de prensa.",
      href: "#",
    },
    {
      label: "Proyectos destacados",
      description: "Recopilacion de colaboraciones en cine y streaming.",
      href: "#",
    },
  ],
  featuredExperience: [
    {
      project: "La Ruta del Viento",
      role: "Actriz principal",
      year: "2025",
      description: "Largometraje independiente estrenado en circuito de festivales regionales.",
    },
    {
      project: "Noches de Puerto",
      role: "Camarografa B",
      year: "2024",
      description: "Serie documental con rodajes en exteriores y cobertura multicamara.",
    },
    {
      project: "Campana Horizonte",
      role: "Talento para branded content",
      year: "2024",
      description: "Contenido digital para marca internacional con piezas verticales y horizontales.",
    },
  ],
};

export const talentRecentActivity: string[] = [
  "Tu perfil aparecio en 12 busquedas de productores esta semana.",
  "Se abrieron nuevas convocatorias para actor, editor y sonidista.",
  "Una postulacion a serie documental paso a estado En revision.",
];

export const talentSummaryCards: Array<{ value: string; label: string }> = [
  { value: "85%", label: "Perfil completado" },
  { value: "14", label: "Convocatorias disponibles" },
  { value: "05", label: "Postulaciones activas" },
];

export const talentQuickActions = [
  { label: "Editar perfil", path: "/talent/profile" },
  { label: "Actualizar disponibilidad", path: "/talent/availability" },
  { label: "Ver convocatorias", path: "/talent/opportunities" },
  { label: "Revisar postulaciones", path: "/talent/applications" },
];

export const talentOpportunitiesMock: TalentOpportunity[] = [
  {
    id: "op-1",
    projectName: "Horizonte Sur",
    productionType: "Serie de ficcion",
    role: "Actor de reparto",
    location: "Santiago, Chile",
    modality: "Por proyecto",
    description: "Produccion en etapa de casting para rodaje entre mayo y junio.",
    urgency: "Casting abierto",
  },
  {
    id: "op-2",
    projectName: "Pulso Urbano",
    productionType: "Documental",
    role: "Camarografo",
    location: "Valparaiso, Chile",
    modality: "Freelance",
    description: "Cobertura en terreno con experiencia en camara documental y entrevistas.",
    urgency: "Urgente",
  },
  {
    id: "op-3",
    projectName: "Sesion 28",
    productionType: "Publicidad",
    role: "Editor audiovisual",
    location: "Remoto",
    modality: "Tiempo completo",
    description: "Proyecto de postproduccion para piezas digitales y adaptaciones sociales.",
    urgency: "Nueva esta semana",
  },
  {
    id: "op-4",
    projectName: "Marea Alta",
    productionType: "Largometraje",
    role: "Sonidista",
    location: "Concepcion, Chile",
    modality: "Por proyecto",
    description: "Equipo de rodaje busca profesional con experiencia en locaciones exteriores.",
    urgency: "Postulacion destacada",
  },
];

export const talentApplicationsMock: TalentApplication[] = [
  {
    id: "app-1",
    projectName: "La Casa de Arena",
    role: "Actriz principal",
    appliedAt: "08 de abril de 2026",
    status: "En revision",
    message: "Tu material fue revisado y el equipo de casting evaluara una siguiente etapa.",
  },
  {
    id: "app-2",
    projectName: "Bitacora del Pacifico",
    role: "Camarografa",
    appliedAt: "03 de abril de 2026",
    status: "Preseleccionado",
    message: "Quedaste preseleccionada para entrevista tecnica y disponibilidad de viaje.",
  },
  {
    id: "app-3",
    projectName: "Instante Cero",
    role: "Editora",
    appliedAt: "29 de marzo de 2026",
    status: "Enviada",
    message: "Tu postulacion fue enviada correctamente y espera revision del productor.",
  },
  {
    id: "app-4",
    projectName: "Cuerpos de Luz",
    role: "Talento para spot",
    appliedAt: "21 de marzo de 2026",
    status: "Aceptado",
    message: "El equipo confirmo tu participacion y pronto compartira el calendario de rodaje.",
  },
  {
    id: "app-5",
    projectName: "Archivo Vivo",
    role: "Sonidista",
    appliedAt: "14 de marzo de 2026",
    status: "Rechazado",
    message: "El proyecto avanzo con un perfil distinto, pero tu material seguira visible.",
  },
];
