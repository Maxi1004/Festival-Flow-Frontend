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

export type TalentProfile = {
  name: string;
  mainSpecialty: string;
  location: string;
  availabilityStatus: string;
  profileCompletion: number;
  bio: string;
  experienceYears: number;
  specialties: string[];
  languages: string[];
  skills: string[];
  portfolio: {
    label: string;
    description: string;
    href: string;
  }[];
  featuredExperience: {
    project: string;
    role: string;
    year: string;
    description: string;
  }[];
};