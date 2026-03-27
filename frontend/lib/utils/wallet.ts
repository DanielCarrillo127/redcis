export function formatWallet(wallet: string): string {
  if (!wallet || wallet.length <= 10) return wallet;
  return `${wallet.slice(0, 5)}...${wallet.slice(-5)}`;
}
