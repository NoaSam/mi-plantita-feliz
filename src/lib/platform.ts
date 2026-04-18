export function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}
