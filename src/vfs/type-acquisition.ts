import * as https from 'https';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { CacheManager } from '../dependencies/cache-manager';

export class TypeAcquisition {
  private cacheManager: CacheManager;
  private typeCache: Map<string, string> = new Map();

  constructor() {
    this.cacheManager = new CacheManager();
  }

  public async acquireTypes(packageName: string, version?: string): Promise<string | null> {
    const cacheKey = version ? `${packageName}@${version}` : packageName;

    // Check cache first
    if (this.typeCache.has(cacheKey)) {
      return this.typeCache.get(cacheKey)!;
    }

    // Try to find in installed packages
    const globalStore = this.cacheManager.getGlobalStorePath();
    const packagePath = this.cacheManager.findPackage(packageName, globalStore);

    if (packagePath) {
      const typesPath = path.join(packagePath, 'index.d.ts');
      if (fs.existsSync(typesPath)) {
        const types = fs.readFileSync(typesPath, 'utf-8');
        this.typeCache.set(cacheKey, types);
        return types;
      }

      // Check @types package
      const typesPackageName = `@types/${packageName.replace('@', '').replace('/', '__')}`;
      const typesPackagePath = this.cacheManager.findPackage(typesPackageName, globalStore);
      if (typesPackagePath) {
        const typesIndex = path.join(typesPackagePath, 'index.d.ts');
        if (fs.existsSync(typesIndex)) {
          const types = fs.readFileSync(typesIndex, 'utf-8');
          this.typeCache.set(cacheKey, types);
          return types;
        }
      }
    }

    // Fetch from Unpkg
    try {
      const types = await this.fetchFromUnpkg(packageName, version);
      if (types) {
        this.typeCache.set(cacheKey, types);
        return types;
      }
    } catch (error) {
      console.error(`Failed to fetch types for ${packageName}:`, error);
    }

    return null;
  }

  private async fetchFromUnpkg(packageName: string, version?: string): Promise<string | null> {
    const packageSpec = version ? `${packageName}@${version}` : packageName;
    const url = `https://unpkg.com/${packageSpec}/index.d.ts`;

    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https:') ? https : http;

      protocol
        .get(url, (res) => {
          if (res.statusCode === 404) {
            // Try @types package
            const typesPackageName = `@types/${packageName.replace('@', '').replace('/', '__')}`;
            const typesUrl = `https://unpkg.com/${typesPackageName}/index.d.ts`;
            protocol
              .get(typesUrl, (typesRes) => {
                if (typesRes.statusCode === 200) {
                  let data = '';
                  typesRes.on('data', (chunk) => {
                    data += chunk;
                  });
                  typesRes.on('end', () => {
                    resolve(data);
                  });
                } else {
                  resolve(null);
                }
              })
              .on('error', reject);
            return;
          }

          if (res.statusCode !== 200) {
            resolve(null);
            return;
          }

          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            resolve(data);
          });
        })
        .on('error', reject);
    });
  }

  public clearCache(): void {
    this.typeCache.clear();
  }
}
