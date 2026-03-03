import { generateInsights } from "../routes/aihelper";

(async () => {
  const text = await generateInsights("Say hello in JSON");
  console.log(text);
})();