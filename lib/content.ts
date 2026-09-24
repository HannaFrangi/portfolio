export const person = {
  name: "Hanna Al Frangi",
  first: "Hanna",
  role: "React & React Native Developer",
  location: "Lebanon",
  github: "https://github.com/hannafrangi",
  linkedin: "https://www.linkedin.com/in/hannafrangi",
};

export type Device = "tablet" | "phones" | "laptop";

export type Project = {
  id: string;
  name: string;
  kind: string;
  summary: string;
  points: string[];
  stack: string[];
  href?: string;
  hrefLabel?: string;
  device: Device;
  /** Screen image under /public/textures, or "reevu" for the drawn dashboard. */
  screen: string;
};

export const featured: Project = {
  id: "robostars",
  name: "RoboStars",
  kind: "Landing page & admin dashboard",
  summary:
    "The public site for a robotics, coding and AI academy, and the tool that runs the business behind it.",
  points: [
    "Custom Next.js landing page built for clean UX, SEO and every screen size.",
    "Admin dashboard managing sessions, tutors, marketing and the gallery.",
    "Role-based access control with granular permissions across every user type.",
  ],
  stack: ["Next.js", "React", "RBAC", "SEO"],
  href: "https://robostarslb.com/",
  hrefLabel: "robostarslb.com",
  device: "tablet",
  screen: "/textures/robostars-desktop.jpg",
};

export const works: Project[] = [
  {
    id: "sms",
    name: "SMS Cleaning",
    kind: "Service company website",
    summary: "Built for phones first: fast to load, easy to find, with clear calls to action.",
    points: [],
    stack: ["React", "Vite", "SEO"],
    href: "https://smscleaninglb.com/",
    hrefLabel: "smscleaninglb.com",
    device: "phones",
    screen: "/textures/sms-cleaning-mobile.jpg",
  },
  {
    id: "homeroots",
    name: "HomeRoots Interior",
    kind: "Interior design landing page",
    summary: "A visual landing page, with image optimization so the portfolio loads as well as it looks.",
    points: [],
    stack: ["Next.js", "Image optimization"],
    href: "http://homerootsinteriors.co/",
    hrefLabel: "homerootsinteriors.co",
    device: "laptop",
    screen: "/textures/homeroots-desktop.jpg",
  },
  {
    id: "reevu",
    name: "Reevu",
    kind: "Restaurant review SaaS",
    summary:
      "Two fully separate dashboards: review management and analytics for each restaurant, plus a super admin panel for listings and moderation.",
    points: [],
    stack: ["React", "Analytics", "Multi-role"],
    device: "tablet",
    screen: "reevu",
  },
];

export const clients = ["TheBooker", "RoboStars", "SMS Cleaning", "HomeRoots Interior", "Reevu"];

export const process = [
  {
    step: "01",
    title: "Discover",
    body: "Sit with the client or the team, pin down the requirements, the roles and what the product has to do.",
  },
  {
    step: "02",
    title: "Build",
    body: "React and React Native interfaces, admin panels and role-based UI, built for scale, performance and security.",
  },
  {
    step: "03",
    title: "Ship",
    body: "Production builds, SEO and Lighthouse passes, then maintenance and updates once it is live.",
  },
];

export const experience = [
  { role: "Junior Software Developer", place: "TheBooker", period: "2024 to now" },
  { role: "Freelance React Developer", place: "Self-employed", period: "2024 to now" },
  { role: "Robotics Instructor", place: "RoboStars", period: "2023 to now" },
];

export const education = [
  { title: "MSc Computer Science", place: "Lebanese International University", period: "2025 to now" },
  { title: "BSc Computer Science", place: "Lebanese International University", period: "2021 to 2025" },
];

export const certificates = ["CCNA: Introduction to Networks", "CCNA: Routing and Switching", "IT Essentials", "Network Security"];

export const toolkit = [
  { group: "Frontend", items: ["React.js", "Next.js", "Vite", "JavaScript (ES6+)", "HTML5", "CSS3"] },
  { group: "Mobile", items: ["React Native"] },
  { group: "Product", items: ["Admin dashboards", "CRUD interfaces", "Role-based UI", "Responsive design"] },
  { group: "Quality", items: ["On-page SEO", "Lighthouse", "Performance", "Cross-browser"] },
  { group: "Shipping", items: ["Git", "GitHub", "Production builds"] },
];
