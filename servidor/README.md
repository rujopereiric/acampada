# A Praça · servidor

O servidor da praça partilhada (`multiplayer.html`). Corre na Cloudflare, no plano gratuito: um Worker e um Durable Object.

- A praça só abre à volta das manifestações de `manifestacoes.json`: uma hora antes do início e até `horas` depois (3 se não disser nada). Manifestações à mesma hora partilham a mesma praça.
- Não guarda nada que identifique as pessoas. O mural é apagado 24 horas depois de a praça fechar.
- No máximo 250 bonecos na praça; quem chegar depois entra como apoio de longe.

## Pôr no ar (uma vez)

Dentro desta pasta, no Terminal:

```
npm install
npx wrangler login
npx wrangler deploy
```

O `login` abre o browser para entrares na conta Cloudflare onde está o domínio acampadapixel.pt. O `deploy` publica o servidor em praca.acampadapixel.pt e cria esse endereço sozinho.

## Experimentar no computador

```
npm run teste
```

Abre a praça mesmo sem manifestação. Depois serve a pasta do jogo (por exemplo `python3 -m http.server 8000` na pasta de cima) e abre http://localhost:8000/multiplayer.html.

## Mudar as manifestações

Edita `manifestacoes.json` na pasta do jogo e faz push. O servidor lê-o de 5 em 5 minutos; não é preciso publicar o servidor outra vez.

Campos: `date` (AAAA-MM-DD), `at` (hora de Portugal, HH:MM), `city` (ou `null` para várias cidades), `title`, `where`, `horas` (opcional), `note` (opcional, só no jogo).
