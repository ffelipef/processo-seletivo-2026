

|  | USER |  |  |  |  |  |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| nome | ID:UUID | nome | email | password\_hash | isAdmin | data\_criacao |
| tipo | pkey | varchar(100) | varchar(150) | varchar(255) | boolean | timestamp |
| restriçao |  | not null | not null, unique | not null | not null, default false |  |

|  | Produtos |  |  |  |  |  |  |  |  |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| nome | ID:UUID | nome | descricao  | preco | estoque | categoria | imagemURL | isDeleted | data\_atializacao |
| tipo | pkey | varchar(150) | TEXT | numeric(10,2) | integer | varchar(50) | varchar(255) | boolean | timestamp |
| restriçao |  | not null | not null | not null | not null, Constraint: stock \>= 0 | not null |  | not null, default falso | default now |

|  | Carrinho |  |  |  |  |
| :---- | :---- | :---- | :---- | :---- | :---- |
| nome | ID:UUID | user\_id | produto\_id | quantidade | (user\_id, producrt\_id) |
| tipo | PKEY | chave estrangeira | chave estrangeira | integer | Chave Única Composta |
| restriçao |  | Cascade on Delete  | Cascade on Delete  | not null, Constraint: quantity \> 0 | garante q o mesmo produto nao apareca em duas linhas diferentes |

|  | Cupons |  |  |  |  |  |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| nome | ID:UUID | codigo | isPercentage | valor(10,2) | valor\_minimo\_pedido | data\_expiracao |
| tipo | pkey | varchar(50) | boolean | NUMERIC(10,2) | NUMERIC(10,2) | timestamp |
| restriçao |  |  | default true |  |  | not null |

|  | Cupons Usados |  |  |  |  |
| :---- | :---- | :---- | :---- | :---- | :---- |
| nome | ID:UUID | user\_id | cupom\_id | data\_uso | coupon\_id, user\_id  |
| tipo | PKEY | chave estrangeira | chave estrangeira | timestamp | pkey composta |
| restriçao |  |  |  | default: now | impede o usuario de usar o mesmo cupom duas vezes |

|  | Pedidos |  |  |  |  |  |  |  |  |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| nome | ID:UUID | user\_id | cupom\_id | total\_original | total\_desconto | total\_final | status | idempotency\_key  | created\_at |
| tipo | PKEY | chave estrangeira | chave estrangeira | numeric(10,2) | numeric(10,2) | numeric(10,2) | VARCHAR(20) | VARCHAR(255) | Timestamo |
| restriçao |  |  | nulo | nao nulo | default:0.00 | nao nulo | Default: 'pendente' | UNICO, NULO | default: now |
|  |  |  |  |  |  |  | valores: pendente, pago, enviado, entregue |  |  |

|  | Histórico de pedidos |  |  |  |  |
| :---- | :---- | :---- | :---- | :---- | :---- |
| nome | ID:UUID | pedido\_id | produto\_id | quantidade | valor\_pago |
| tipo | PKEY | chave estrangeira | chave estrangeira | integer | numeric(10,2) |
| restriçao |  |  |  | nao nulo | nao nulo |

