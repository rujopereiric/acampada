# A Praça · servidor

O servidor da praça partilhada (`multiplayer.html`). Corre na Cloudflare, no plano gratuito: um Worker e um Durable Object.

- A praça abre à volta do que está em `manifestacoes.json` (manifestações e a Assembleia Geral diária) e das aberturas agendadas na página de gestão. Tudo o que calhar à mesma hora partilha a mesma praça.
- A organização gere a praça em https://praca.acampadapixel.pt/gestao (palavra-passe `GESTAO_FRASE`).
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

Depois cria a palavra-passe da página de gestão (escreve-a quando pedir; não aparece no ecrã):

```
npx wrangler secret put GESTAO_FRASE
```

Também se pode criar ou mudar no painel da Cloudflare: Workers & Pages → acampada-praca → Settings → Variables and Secrets → Add → tipo Secret, nome `GESTAO_FRASE`. Mudar a palavra-passe tira o acesso a quem tinha a antiga.

## Experimentar no computador

```
npx wrangler dev --var FORCE_OPEN:1 --var GESTAO_FRASE:teste
```

Abre a praça mesmo sem manifestação. Depois serve a pasta do jogo (por exemplo `python3 -m http.server 8000` na pasta de cima) e abre http://localhost:8000/multiplayer.html.

## Mudar as manifestações

Edita `manifestacoes.json` na pasta do jogo e faz push. O servidor lê-o de 5 em 5 minutos; não é preciso publicar o servidor outra vez.

Campos:
- `title`, `where`, `city` (ou `null` para várias cidades), `note` (opcional, só no jogo)
- `date` (AAAA-MM-DD) para um dia, ou `dias` (por exemplo `["seg","ter","qua","qui","sex"]`) para repetir todas as semanas
- `at`: a hora de início (hora de Portugal, HH:MM)
- `abre` e `fecha` (opcionais, HH:MM): quando a praça abre e fecha; sem eles, abre 1 hora antes e fecha `horas` depois (3 se não disser nada)
- `dj: false`: o DJ p.45 não aparece depois da hora de início (a assembleia)
- `so_praca: true`: não aparece no ecrã inicial do jogo, só na praça
