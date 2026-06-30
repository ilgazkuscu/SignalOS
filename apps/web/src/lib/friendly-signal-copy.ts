export function friendlySignalLabel(value: string) {
  const labels: Record<string, string> = {
    trumpTelemetry: "Trump statements",
    leaderSchedule: "Leader schedule",
    cabinetAlignment: "Team alignment",
    forcePosture: "Military posture",
    strategicFlights: "Flight activity",
    diplomaticChannels: "Diplomacy",
    proxyTempo: "Conflict pressure",
    pizzaIndex: "Early chatter",
    resolutionWording: "Official wording",
    marketMicrostructure: "Outside view movement",
    macroConfirmation: "Macro confirmation",
    manualJudgment: "Manual review",
    diplomatic_channel: "Diplomacy",
    explicit_end_language: "Clear official ending",
    oman_talks: "Oman talks",
    reduced_sortie_tempo: "Reduced flights",
    pause_language: "Pause language",
    deescalatory_tone: "Calmer tone",
  };

  return labels[value] ?? value.replace(/([a-z])([A-Z])/g, "$1 $2").replaceAll("_", " ");
}

export function friendlyCopy(value: string) {
  return value
    .replace(/signals?/gi, "evidence")
    .replace(/bucket ladder/gi, "date list")
    .replace(/bucket/gi, "date")
    .replace(/market/gi, "outside view")
    .replace(/contract/gi, "date")
    .replace(/resolve the outside view/gi, "settle the question")
    .replace(/qualifying announcement/gi, "clear official statement");
}
