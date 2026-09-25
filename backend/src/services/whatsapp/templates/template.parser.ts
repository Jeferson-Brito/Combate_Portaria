export interface TemplateVariables {
  cliente: string;
  visitante: string;
  empresa?: string;
  tipo?: string;
  motivo: string;
  horario: string;
  veiculo?: string;
  placa?: string;
  codigo?: string;
}

export function parseMessageTemplate(template: string, vars: TemplateVariables): string {
  let content = template;

  content = content.replace(/\{\{cliente\}\}/gi, vars.cliente);
  content = content.replace(/\{\{visitante\}\}/gi, vars.visitante);
  content = content.replace(/\{\{empresa\}\}/gi, vars.empresa || 'Não informada');
  content = content.replace(/\{\{tipo\}\}/gi, vars.tipo || 'Visitante');
  content = content.replace(/\{\{motivo\}\}/gi, vars.motivo);
  content = content.replace(/\{\{horario\}\}/gi, vars.horario);
  content = content.replace(
    /\{\{veiculo\}\}/gi,
    vars.veiculo ? `${vars.veiculo}${vars.placa ? ` (Placa: ${vars.placa})` : ''}` : 'Nenhum'
  );
  content = content.replace(/\{\{placa\}\}/gi, vars.placa || '');
  content = content.replace(/\{\{codigo\}\}/gi, vars.codigo || '');

  return content;
}

export const DEFAULT_APPROVAL_TEMPLATE = `Olá, *{{cliente}}*!

Há um visitante aguardando sua autorização na portaria.

👤 *Visitante:* {{visitante}}
🏢 *Empresa:* {{empresa}}
📋 *Tipo:* {{tipo}}
🎯 *Motivo:* {{motivo}}
⏰ *Chegada:* {{horario}}
🚗 *Veículo:* {{veiculo}}
🔖 *Solicitação:* {{codigo}}

Deseja autorizar a entrada?
Responda com:
*1* para *AUTORIZAR*
*2* para *RECUSAR*`;

export const DEFAULT_REMINDER_TEMPLATE = `⏳ Olá, *{{cliente}}*!

O visitante *{{visitante}}* ainda aguarda sua liberação na portaria (Ref: {{codigo}}).

Por favor, responda com:
*1* para *AUTORIZAR* ou *2* para *RECUSAR*.`;
