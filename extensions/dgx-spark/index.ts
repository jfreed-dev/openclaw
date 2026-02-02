import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { Type } from "@sinclair/typebox";
import { stringEnum } from "openclaw/plugin-sdk";

const DEFAULT_BASE_URL = "http://127.0.0.1:5001";

type PluginConfig = { baseUrl?: string };

async function post(baseUrl: string, path: string, body: Record<string, unknown>) {
  const url = `${baseUrl}${path}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      const detail =
        data && typeof data === "object" && "detail" in data
          ? (data as Record<string, unknown>).detail
          : res.statusText;
      return { error: true, status: res.status, detail };
    }
    return data;
  } catch (err) {
    return { error: true, detail: String(err) };
  }
}

const dgxSparkPlugin = {
  id: "dgx-spark",
  name: "DGX Spark",
  description: "Tool plugin wrapping the DGX Spark Platform Controller (MPC) service.",

  register(api: OpenClawPluginApi) {
    const cfg = (api.pluginConfig ?? {}) as PluginConfig;
    const baseUrl = cfg.baseUrl?.replace(/\/+$/, "") ?? DEFAULT_BASE_URL;

    // dgx_spark_exec -- POST /run_command
    api.registerTool(
      {
        name: "dgx_spark_exec",
        label: "DGX Spark Exec",
        description:
          "Execute a shell command inside a sandboxed Docker container on the DGX Spark host. " +
          "The container has GPU access but no network. Use for compiling/running CUDA code or diagnostics.",
        parameters: Type.Object({
          command: Type.String({ description: "Shell command to execute in the sandbox" }),
        }),
        async execute(_toolCallId, params) {
          const { command } = params as { command: string };
          const result = await post(baseUrl, "/run_command", { command });
          return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          };
        },
      },
      { name: "dgx_spark_exec" },
    );

    // dgx_spark_package -- POST /manage_package
    api.registerTool(
      {
        name: "dgx_spark_package",
        label: "DGX Spark Package",
        description: "Install or remove a system package (apt) on the DGX Spark host.",
        parameters: Type.Object({
          action: stringEnum(["install", "remove"] as const, {
            description: "Whether to install or remove the package",
          }),
          package_name: Type.String({ description: "Name of the apt package" }),
        }),
        async execute(_toolCallId, params) {
          const { action, package_name } = params as { action: string; package_name: string };
          const result = await post(baseUrl, "/manage_package", { action, package_name });
          return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          };
        },
      },
      { name: "dgx_spark_package" },
    );

    // dgx_spark_settings -- POST /get_settings
    api.registerTool(
      {
        name: "dgx_spark_settings",
        label: "DGX Spark Settings",
        description:
          "Retrieve a system setting from the DGX Spark host (CUDA version, OS name, or home directory).",
        parameters: Type.Object({
          setting_key: stringEnum(["cuda_version", "os_name", "home_directory"] as const, {
            description: "Setting to retrieve",
          }),
        }),
        async execute(_toolCallId, params) {
          const { setting_key } = params as { setting_key: string };
          const result = await post(baseUrl, "/get_settings", { setting_key });
          return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          };
        },
      },
      { name: "dgx_spark_settings" },
    );
  },
};

export default dgxSparkPlugin;
