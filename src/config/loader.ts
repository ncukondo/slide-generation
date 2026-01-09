import { readFile } from 'fs/promises';
import { parse as parseYaml } from 'yaml';
import { configSchema, type Config } from './schema';

export class ConfigLoader {
  async load(configPath?: string): Promise<Config> {
    const fileConfig = await this.loadFile(configPath);
    return configSchema.parse(fileConfig);
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
