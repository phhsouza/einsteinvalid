# Branch: backups

Snapshots automáticos diários do banco Firebase do EinsteinValid.
Gerados pelo workflow `.github/workflows/backup.yml` (na branch main).

Cada arquivo `backups/YYYY-MM-DD.json` contém `usuarios/` e `setores/` do dia.
Para restaurar: baixe o arquivo raw, abra o app admin → 💾 Backup → Selecionar arquivo.
