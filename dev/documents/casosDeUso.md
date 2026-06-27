## Domínio 1: Autenticação & Usuários 
* UC01 - Registrar Usuário: Permitir o cadastro de novos usuários informando email, nome e senha. Por padrão, novos cadastros entram como consumidores.
* UC02 - Editar Usuário: Usuário padrão (customer) pode alterar dados como senha ou nome ou email.
* UC03 - Registrar Admin: Para maior segurança, apenas admin podem promover outros usuários a admin.
* UC04 - Efetuar Login: Autenticar o usuário com e-mail e senha, retornando um token JWT válido. 
* UC05 - Proteger Rotas por Papel: Garantir que apenas usuários com o papel de admin acessem funções de gerenciamento, e customer acessem funções de compra.
* UC06 - Deletar conta: O usuário customer pode deletar a própria conta, mas o usúario admin além de poder deletar a própria conta tambem pode deletar a conta de outros usuários. Ambas as ações exigem confirmação de ação. Ex: “você tem certeza dessa ação?”

## Domínio 2: Catálogo de Produtos 
* UC07 - Manter Produtos (CRUD - Apenas Admin): Criar, listar, detalhar, atualizar e remover produtos (nome, descrição, preço, estoque, categoria, imagem). 
* UC08 - Buscar Produtos com Filtros (TODOS): Listar produtos com suporte a paginação e filtros combinados por nome, categoria e faixa de preço. 
* UC09 - Consultar Produto via Cache: Garantir que a listagem/busca de produtos passe pelo Redis antes de tocar no banco. O cache deve ser invalidado em qualquer alteração (UC07). 

## Domínio 3: Carrinho de Compras
* UC10 - Gerenciar Itens do Carrinho: Adicionar, atualizar quantidade e remover itens de um carrinho associado ao usuário autenticado (persistido no banco). 
* UC11- Validar Estoque no Carrinho: Impedir a adição ou atualização de um item caso a quantidade solicitada exceda o estoque disponível no momento. 
UC12 - Limpar Carrinho: Esvaziar completamente o carrinho do usuário. 

## Domínio 4: Checkout & Pedidos 
* UC13 - Realizar Checkout (Reserva Atômica): Fechar o pedido validando novamente o estoque. O sistema deve travar o registro do produto para que duas requisições simultâneas concorrendo pelo último item não causem venda sem estoque (overselling). 
* UC14 - Aplicar Máquina de Estados do Pedido: Mudar o status do pedido estritamente seguindo o fluxo regulamentado: PENDING ➔ PAID ➔ SHIPPED ➔ DELIVERED. 
* UC15 - Cancelar Pedido: Permitir o cancelamento pelo usuário se o status for anterior a SHIPPED, devolvendo os itens ao estoque do produto automaticamente.
* UC16 - Processar Pagamento (Webhook): Receber a confirmação ou falha de pagamento simulada ou via integração real (ex: Stripe/Abacate Pay), alterando o estado do pedido.

## Domínio 5: Cupons de Desconto
* UC17 - Validar Cupom no Checkout: Verificar se o cupom inserido é válido (dentro da data de expiração, se o valor mínimo do pedido foi atingido e se o usuário já não o utilizou antes). 
* UC18 - Calcular Desconto: Aplicar a dedução (seja em valor fixo ou percentual) no montante final do checkout antes de fechar o pedido. 
