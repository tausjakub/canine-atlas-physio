// Shows the start of the exam content pane. On desktop the pane scrolls on its
// own; on phones the panes stack, so the page itself must scroll to it.
export function revealLesson() {
  const panel = document.getElementById('exam-lesson');
  if (!panel) return;
  if (window.matchMedia('(max-width: 760px)').matches)
    panel.scrollIntoView({ block: 'start' });
  else panel.scrollTo({ top: 0 });
}
