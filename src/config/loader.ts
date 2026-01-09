import { access, readFile } from 'fs/promises';
import { join } from 'path';
import { parse as parseYaml } from 'yaml';
import { configSchema, type Config } from './schema';

const CONFIG_NAMES = ['config.yaml', 'slide-gen.yaml'];

export class ConfigLoader {
  async load(configPath?: string): Promise<Config> {
    const fileConfig = await this.loadFile(configPath);
    return configSchema.parse(fileConfig);
  }

  async findConfig(directory: string): Promise<string | undefined> {
    for (const name of CONFIG_NAMES) {
      const path = join(directory, name);
      try {
        await access(path);
        return path;
      } catch {
        // Continue to next
      }
    }
    return undefined;
  }

  private async loadFile(configPath?: string): Promise<unknown> {
    if (!configPath) return {};

    try {
      const content = await readFile(configPath, 'utf-8');
      return parseYaml(content) ?? {};
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return {};
      }
      throw error;
    }
  }
}
