# EinsteinValid

Web app para conferência e cálculo de remuneração de plantões médicos a partir da escala exportada.

## Como usar

1. Login (admin / admin)
2. Fazer upload do Excel da escala (`.xls` ou `.xlsx`)
3. Confirmar o mês de referência (autopreenchido)
4. Marcar os noturnos que foram acionados
5. Baixar o Excel com o resumo

## Stack
- HTML/CSS/JS puro
- SheetJS (leitura/geração de Excel no browser)
- Hospedado na Vercel

## Notas
- O script Python original (`conferir.py`) continua disponível para uso via linha de comando.
- As marcações de noturnos ficam salvas no `localStorage` do navegador (por mês).
