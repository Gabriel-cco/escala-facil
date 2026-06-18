## ADDED Requirements

### Requirement: Visualizar atribuições de um evento

O sistema SHALL exibir, na página de detalhe de um evento, todas as atribuições (membro + função) já criadas para aquele evento, identificando claramente o nome da função e o nome do membro de cada uma.

#### Scenario: Evento com atribuições

- **WHEN** o coordenador abre a página de um evento que possui atribuições
- **THEN** o sistema lista cada atribuição mostrando o nome da função e o nome do membro escalado

#### Scenario: Evento sem atribuições

- **WHEN** o coordenador abre a página de um evento que ainda não possui atribuições
- **THEN** o sistema exibe uma mensagem indicando que nenhum membro foi escalado ainda

### Requirement: Criar uma atribuição

O sistema SHALL permitir que o coordenador atribua um membro a uma função dentro de um evento, escolhendo uma função e um membro elegível e persistindo a atribuição em `assignments` com referência ao evento, à função e ao membro.

#### Scenario: Atribuição criada com sucesso

- **WHEN** o coordenador seleciona uma função e um membro elegível e confirma a atribuição
- **THEN** o sistema persiste a atribuição vinculada ao evento e a nova atribuição passa a aparecer na lista do evento

#### Scenario: Campos obrigatórios não preenchidos

- **WHEN** o coordenador tenta confirmar sem ter selecionado função e membro
- **THEN** o sistema não cria a atribuição e exibe uma mensagem indicando que função e membro são obrigatórios

### Requirement: Elegibilidade de membros para uma função

O sistema SHALL oferecer para seleção apenas membros elegíveis para a função escolhida. Um membro é elegível quando pertence ao mesmo grupo da função, está ativo e não está suspenso na data do evento.

#### Scenario: Membro de outro grupo não é oferecido

- **WHEN** o coordenador escolhe uma função pertencente a um grupo
- **THEN** o sistema oferece apenas membros daquele mesmo grupo para seleção

#### Scenario: Membro suspenso na data do evento não é oferecido

- **WHEN** um membro do grupo está suspenso (`suspenso_ate` igual ou posterior à data do evento) ou inativo
- **THEN** o sistema não oferece esse membro como opção de atribuição para esse evento

### Requirement: Unicidade da atribuição

O sistema SHALL impedir que o mesmo membro seja atribuído à mesma função no mesmo evento mais de uma vez, garantindo a unicidade da combinação (evento, função, membro) tanto na interface quanto por restrição no banco.

#### Scenario: Tentativa de atribuição duplicada

- **WHEN** o coordenador tenta atribuir um membro a uma função à qual ele já está atribuído nesse evento
- **THEN** o sistema rejeita a operação e informa que a atribuição já existe

### Requirement: Remover uma atribuição

O sistema SHALL permitir que o coordenador remova uma atribuição existente de um evento.

#### Scenario: Remoção de uma atribuição

- **WHEN** o coordenador remove uma atribuição da lista do evento
- **THEN** o sistema exclui o registro correspondente e a atribuição deixa de aparecer na lista
