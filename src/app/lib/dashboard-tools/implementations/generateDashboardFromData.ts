import { z } from "zod";
import { generateDashboardFromDataSchema } from "../toolDefs";
import { generateDashboardSpecificationSchema } from "../toolDefs";
import { generateDashboardSpecification } from "./generateDashboardSpecification";

type Args = z.infer<typeof generateDashboardFromDataSchema>;

// Generates a dashboard specification directly from raw JSON data
export async function generateDashboardFromData(args: Args) {
  try {
    // Parse the JSON
    const parsed = JSON.parse(args.data);

    // Build a field schema by inferring types
    const fields = Object.entries(parsed).map(([key, value]) => {
      let type: "string" | "number" | "boolean" | "date" | "array" | "object";
      if (typeof value === "number") type = "number";
      else if (typeof value === "boolean") type = "boolean";
      else if (Array.isArray(value)) type = "array";
      else if (typeof value === "object" && value !== null) type = "object";
      else type = "string";
      return { name: key, type };
    });

    // Construct args for the existing specification generator
    const specArgs: z.infer<typeof generateDashboardSpecificationSchema> = {
      schema: { fields },
      customizations: {},
    };
    const result = await generateDashboardSpecification(specArgs);
    return result;
  } catch {
    return {
      success: false,
      error: "Invalid JSON or failed to generate dashboard specification",
    };
  }
}