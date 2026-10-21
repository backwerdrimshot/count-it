import type { QuestionChoice } from "./generator";

export function misconceptionMessage(choice: QuestionChoice | undefined, response?: "eighths-v1" | "half-beats-v1"): string {
  if (response) {
    switch (choice?.category) {
      case "added_sound": return "That count adds a note start where none is written.";
      case "omitted_sound": return "That count leaves out a written note start.";
      case "shifted_subdivision": return "That count moves a note start between the beat and its halfway position.";
    }
  }
  switch (choice?.category) {
    case "omitted_sound":
      return "That choice leaves out a written note start.";
    case "added_sound":
      return "That choice adds a note start where none is written.";
    case "shifted_subdivision":
      return "That choice shifts a written note start to a different subdivision.";
    case "eighth_sixteenth_confusion":
      return "Check which subdivision position the note belongs on.";
    case "wrong_beat_number":
      return "The subdivision shape is close, but the beat number is not.";
    default:
      return "Compare each notehead with the complete subdivision underneath it.";
  }
}
