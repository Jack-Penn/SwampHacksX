import "dotenv/config"; // loads in dotenv and adds values onto process.env
import { env } from "node:process";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

const schema = {
  description: "Word/Phrase Translation",
  type: SchemaType.OBJECT,
  properties: {
    Translation: {
      type: SchemaType.STRING,
      description: "Meaning of word/phrase",
      nullable: false,
    },
    PhraseToken: {
      type: SchemaType.STRING,
      description: "Longer language fragment. Contains the longer token of the original phrase equivalent to a word or phrase in the translated to language when translation isn't one-to-one.",
      nullable: true,
    },
  },
  required: ["Translation"],
};

const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash-exp",
  generationConfig: {
    responseMimeType: "application/json",
    responseSchema: schema,
  },
});

export default async function translateSegment(segment, phrase, desiredLang) {
  console.log("gemini query", segment, phrase, desiredLang);
  try {
    const result = await model.generateContent(`Translate "${segment}" to language with code: "${desiredLang}" in "${phrase}"`);
    return result.response.text();
  } catch (error) {
    console.log(error);
  }
}
