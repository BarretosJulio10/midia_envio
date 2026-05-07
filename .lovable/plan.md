## Plano

Substituir o placeholder em `src/routes/index.tsx` por uma página simples exibindo "Olá".

### Alterações
- **`src/routes/index.tsx`**: remover o `PlaceholderIndex` e renderizar um layout centralizado com um `<h1>` contendo "Olá", usando tokens semânticos (`bg-background`, `text-foreground`).
- Atualizar o `head()` no `__root.tsx` não é necessário para esta tarefa simples (mantém título padrão), a menos que você queira um título customizado.

### Resultado
A rota `/` exibirá "Olá" centralizado na tela, respeitando o design system.