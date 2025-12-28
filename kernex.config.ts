/**
 * Kernex Core Configuration
 * 
 * This file serves as the central authority for platform identity, 
 * versioning, and runtime metadata.
 */

export interface KernexConfig {
  /** The official platform name */
  readonly name: string;
  /** Foundational release version (SemVer) */
  readonly version: string;
  /** Primary identity slogan used across the runtime surface */
  readonly about: string;
  /** Technical description of the kernel capability */
  readonly description: string;
  /** Global platform metadata */
  readonly metadata: {
    readonly repository: string;
    readonly license: string;
    readonly author: string;
    readonly documentation: string;
  };
  /** Runtime defaults and constraints */
  readonly runtime: {
    readonly defaultLocale: string;
    readonly defaultTimeZone: string;
    readonly sessionTimeoutMs: number;
  };
}

export const KERNEX_CONFIG: KernexConfig = {
  name: 'Kernex',
  version: '0.1.0',
  about: 'Your personal programmable runtime.',
  description: 'A self-hosted, single-tenant, programmable workspace runtime built for spatial process management.',
  
  metadata: {
    repository: 'https://github.com/Arjun-M/Kernex',
    license: 'MIT',
    author: 'Arjun-M',
    documentation: 'https://github.com/Arjun-M/Kernex/wiki',
  },

  runtime: {
    defaultLocale: 'en-US',
    defaultTimeZone: 'UTC',
    sessionTimeoutMs: 1000 * 60 * 60 * 24 * 7, // 7 days
  },
} as const;

export default KERNEX_CONFIG;