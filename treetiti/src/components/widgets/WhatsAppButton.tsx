import { MessageCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../i18n/LanguageProvider";

const RU_WHATSAPP = "79990004136";

interface WhatsAppButtonProps {
  phoneNumber: string;
  message?: string;
  label?: string;
}

export function WhatsAppButton({
  phoneNumber,
  message,
  label,
}: WhatsAppButtonProps) {
  const { t } = useTranslation();
  const { lang } = useLanguage();
  const resolvedMessage = message ?? t("whatsapp.message");
  const encodedMessage = encodeURIComponent(resolvedMessage);
  const resolvedNumber = lang === "ru" ? RU_WHATSAPP : phoneNumber;
  const whatsappUrl = `https://wa.me/${resolvedNumber}?text=${encodedMessage}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 left-6 z-50 w-14 h-14 rounded-full bg-[#25D366] text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center group"
      aria-label={label ?? t("whatsapp.contactUs")}
    >
      <MessageCircle className="w-6 h-6" />
    </a>
  );
}
