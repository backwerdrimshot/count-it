"use client";
import { createContext, useContext } from "react";

// Assignment-scoped: free practice and existing guides retain their vocabulary.
export const ResponseVocabularyContext = createContext<"eighths-v1" | undefined>(undefined);
export const useResponseVocabulary = () => useContext(ResponseVocabularyContext);
