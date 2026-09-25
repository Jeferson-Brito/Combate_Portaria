export function formatWhatsAppNumber(phone: string): string {
  // Remove tudo que não for dígito
  let cleaned = phone.replace(/\D/g, '');

  // Se começar com 0, remove
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }

  // Se não tiver o DDI do Brasil (55) e tiver 10 ou 11 dígitos, adiciona o 55
  if ((cleaned.length === 10 || cleaned.length === 11) && !cleaned.startsWith('55')) {
    cleaned = `55${cleaned}`;
  }

  // Validação: no Brasil um número com DDI 55 tem entre 12 e 13 dígitos (55 + DDD de 2 dígitos + 8 ou 9 dígitos)
  if (cleaned.length < 12 || cleaned.length > 13) {
    throw new Error('Número de WhatsApp inválido. Informe o DDD e o número completo.');
  }

  return cleaned;
}
