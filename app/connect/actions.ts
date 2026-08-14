'use server';

import { redirect } from 'next/navigation';
import { requestApp } from '@/presentation/session.js';

export async function startAuthorization() {
  const app = await requestApp();
  const { authorizationUrl } = await app.startConnection.execute();
  redirect(authorizationUrl);
}
