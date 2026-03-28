import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    DYNAMO_ACCESS_KEY_ID: process.env.DYNAMO_ACCESS_KEY_ID ?? '',
    DYNAMO_SECRET_ACCESS_KEY: process.env.DYNAMO_SECRET_ACCESS_KEY ?? '',
    DYNAMO_REGION: process.env.DYNAMO_REGION ?? 'us-east-1',
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD ?? '',
    SESSION_SECRET: process.env.SESSION_SECRET ?? '',
    ADMIN_API_KEY: process.env.ADMIN_API_KEY ?? '',
  },
};

export default nextConfig;
