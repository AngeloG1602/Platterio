import { t } from "@/lib/i18n";

/** Crédito obligatorio de los modelos con licencia CC BY. */
export function ModelCredit({
  credit,
}: {
  credit: { title: string; author: string; source: string; license: string; licenseUrl: string };
}) {
  return (
    <p className="text-muted -mt-3 text-xs">
      {t("Modelo 3D")}: “{credit.title}” — {credit.author} ({credit.source}),{" "}
      <a
        href={credit.licenseUrl}
        target="_blank"
        rel="noreferrer"
        className="underline underline-offset-2"
      >
        {credit.license}
      </a>
      .
    </p>
  );
}
