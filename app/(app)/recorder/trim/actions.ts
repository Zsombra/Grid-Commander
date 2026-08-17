'use server';

import { redirect } from 'next/navigation';
import { acting } from '@/presentation/session.js';
import { requiredInteger, requiredText } from '@/presentation/form.js';
import { spending } from '@/presentation/confirmation-refusal.js';

export async function performTrim(formData: FormData) {
  const { app, user } = await acting();
  if (user.kind === 'not-connected') redirect('/connect');

  const before = new Date(requiredText(formData, 'before'));
  const result = await spending(
    () =>
      app.trimRecord.execute({
        userId: user.authority.userId,
        before,
        describedRuns: requiredInteger(formData, 'describedRuns'),
        confirmationToken: requiredText(formData, 'confirmationToken'),
      }),
    // The same road the command's own refusal takes, three lines down. This
    // command returns its refusals rather than throwing — the pattern the rest
    // of the product should have copied — but the confirmation guard throws
    // from underneath it either way.
    (problem) => {
      const day = before.toISOString().slice(0, 10);
      redirect(`/recorder/trim?before=${day}&problem=${encodeURIComponent(problem)}`);
    },
  );

  if (result.kind === 'refused') {
    // Back to the page that asked, where the person who clicked still stands.
    const day = before.toISOString().slice(0, 10);
    redirect(`/recorder/trim?before=${day}&problem=${encodeURIComponent(result.reason)}`);
  }

  /**
   * A marker, carrying no figures.
   *
   * `result.outcome` states what was removed and the command still returns it —
   * that is the trim's answer to its caller. What it must not become is a
   * sentence in an address bar: the numbers were real, and putting real numbers
   * somewhere anyone can edit is what turned them into a claim nobody could
   * check. The receipt reads the record instead.
   */
  redirect('/recorder/trim?trimmed=1');
}
