import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import pageHtml from "@/components/cinematic/html/contact.html?raw";
import { CinematicPage, type CinematicScript } from "@/components/cinematic/CinematicPage";
import { supabase } from "@/integrations/supabase/client";

const SCRIPTS: CinematicScript[] = [
  { src: "/cinematic/js/contact.js" },
  { src: "/cinematic/js/navigation.js" },
  { src: "/cinematic/js/text-effect.js" },
  { src: "/cinematic/js/anime.umd.min.js" },
  { src: "/cinematic/js/motion-anime.js" },
];

const INQUIRY_TYPES = [
  "general",
  "individual",
  "company",
  "partnership",
  "training",
  "media",
  "other",
];

type ContactSubmission = {
  full_name: string;
  email: string;
  phone: string | null;
  organization: string | null;
  inquiry_type: string;
  subject: string;
  message: string;
};

declare global {
  interface Window {
    saaeContactSubmit?: (submission: ContactSubmission) => Promise<void>;
  }
}

const cap = (value: string, max: number) => value.trim().slice(0, max);
const optional = (value: string | null, max: number) => {
  const trimmed = (value ?? "").trim();
  return trimmed === "" ? null : trimmed.slice(0, max);
};

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact SAAE | Start a conversation that goes somewhere" },
      { name: "theme-color", content: "#144248" },
    ],
    links: [
      { rel: "stylesheet", href: "/cinematic/css/contact.css" },
      { rel: "stylesheet", href: "/cinematic/css/navigation.css" },
    ],
  }),
  component: Page,
});

function Page() {
  /* The page markup and its script are the approved prototype's. The script
     hands the enquiry here rather than opening a mail draft, so submissions
     reach contact_messages exactly as the previous React form did. Field caps
     mirror that form's validation. */
  useEffect(() => {
    window.saaeContactSubmit = async (submission) => {
      const row = {
        full_name: cap(submission.full_name, 100),
        email: cap(submission.email, 255),
        phone: optional(submission.phone, 30),
        organization: optional(submission.organization, 150),
        inquiry_type: INQUIRY_TYPES.includes(submission.inquiry_type)
          ? submission.inquiry_type
          : "general",
        subject: cap(submission.subject, 200),
        message: cap(submission.message, 2000),
      };
      if (row.full_name.length < 2 || row.subject.length < 2 || row.message.length < 5) {
        throw new Error("Incomplete enquiry");
      }
      const { error } = await supabase.from("contact_messages").insert(row);
      if (error) throw new Error(error.message);
    };
    return () => {
      delete window.saaeContactSubmit;
    };
  }, []);

  return <CinematicPage html={pageHtml} scripts={SCRIPTS} bodyClass="page-contact" />;
}
