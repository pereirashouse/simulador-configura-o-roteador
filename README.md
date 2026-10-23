# Simulador de configuração de roteador

Simulador educacional de um painel de roteador Wi-Fi residencial, com seis desafios progressivos e feedback imediato. Foi criado na Licenciatura em Computação para ensinar conceitos de rede sem fio a partir de situações reais: SSID, canal, largura de canal, potência, segurança, QoS e leitura de log.

> **Simulador educacional — não é um roteador real.** As configurações são fictícias e executadas somente no navegador. Nada é enviado a nenhum equipamento.

**Demonstração:** https://pereirashouse.github.io/simulador-configura-o-roteador/

## Problema

Configurar um roteador é uma das primeiras tarefas práticas de redes, mas raramente dá para deixar cada aluno mexer em um equipamento de verdade: falta aparelho, há risco de derrubar a rede da escola e o aluno não sabe se o que fez está certo. Uma interface parecida com a real, sem consequências e com correção automática resolve as três coisas.

## Objetivo de aprendizagem

Ao final dos desafios, o estudante deve ser capaz de:

- ajustar uma rede 2,4 GHz para alcance (largura de 20 MHz e potência);
- escolher um canal a partir de uma varredura de redes vizinhas;
- explicar a diferença entre as faixas de 2,4 GHz e 5 GHz;
- reconhecer configurações inseguras (WEP, TKIP, senha fraca, WPS) e corrigi-las;
- configurar QoS com a banda real do link e priorizar videochamadas;
- interpretar um log de eventos e decidir a primeira ação.

**Público:** anos finais do Ensino Fundamental e Ensino Médio (eixo Mundo Digital da BNCC Computação), cursos técnicos e oficinas de introdução a redes.
**Duração sugerida:** uma aula de 50 minutos.
**Conhecimentos prévios:** saber o que é uma rede Wi-Fi.

## Como funciona

- Menu lateral com os painéis Início, Status, Wireless 2.4 GHz, Wireless 5 GHz, QoS e Ferramentas do Sistema.
- Ao clicar em **Salvar**, o simulador confere os campos do painel (SSID com até 32 caracteres, senha de 8 a 63 caracteres, banda de QoS só com números) e grava a configuração.
- O quadro **Desafios** traz o enunciado, uma dica opcional e o botão **Verificar**. A verificação usa a configuração salva, como em um roteador real, e avisa se há alterações na tela que ainda não foram salvas.
- O feedback diz o que está certo ou errado e explica por quê. Ao acertar, aparece uma explicação do conceito e um exemplo do mundo real.
- O progresso fica salvo só no navegador (`localStorage`). **Recomeçar tudo** apaga o progresso e volta às configurações iniciais.

## Desafios

| # | Desafio | Onde | Critério de validação |
|---|---|---|---|
| 1 | Mais alcance na rede 2,4 GHz | Wireless 2.4GHz | Rádio ligado, largura **20 MHz** e potência **Alta** |
| 2 | Escolha o canal com menos interferência | Status + Wireless 2.4GHz | Canal **11** (o único quase livre na varredura) e largura de 20 MHz |
| 3 | 2,4 GHz ou 5 GHz? | Quadro do desafio | Cinco frases classificadas corretamente e uma explicação com pelo menos 40 caracteres, comparada depois com uma resposta de referência |
| 4 | Encontre a configuração insegura | Wireless 2.4GHz e 5GHz | Nenhuma rede aberta, WEP ou TKIP; senha com 12+ caracteres, fora da lista das mais usadas e não só números; WPS desligado |
| 5 | Priorize as aulas on-line | Status + QoS | QoS ligado, download entre 80000 e 100000 Kbps, upload entre 16000 e 20000 Kbps (80% a 100% do plano) e prioridade para videochamadas |
| 6 | Interprete o log de eventos | Ferramentas do Sistema | Reconhecer a tentativa de adivinhar a senha (8 falhas do mesmo MAC seguidas de conexão) e escolher trocar a senha e reforçar a segurança |

Cada resposta errada tem um feedback próprio. Exemplos: escolher o canal 1 mostra que ele tem 5 redes vizinhas; informar no QoS uma banda maior que a do plano explica que assim o roteador não percebe a fila cheia; responder "a internet caiu" no desafio 6 aponta a linha do log que mostra a WAN estável.

## Para o professor

1. **Abertura (5 min):** pergunte quem já entrou na configuração do roteador de casa e o que encontrou lá.
2. **Desafios 1 e 2 (10 min):** em duplas. Discuta por que "mais largo" não é sempre melhor.
3. **Desafio 3 (8 min):** individual. Peça para duas ou três pessoas lerem a explicação antes de mostrar a resposta de referência.
4. **Desafios 4 e 5 (15 min):** em duplas. Relacione com a rede da própria escola, sem expor senhas reais.
5. **Desafio 6 e fechamento (12 min):** discuta como um técnico lê um log: ordem dos eventos, o que se repete, o que está normal.

**Avaliação:** o próprio simulador indica a conclusão de cada desafio. Para avaliação formativa, peça a explicação do desafio 3 e uma frase sobre a decisão tomada no desafio 6.

**Acessibilidade:** menu e desafios navegáveis por teclado, campos com rótulo, mensagens anunciadas a leitores de tela (`aria-live`) e layout adaptado para celular.

## Como executar

Abra `index.html` em qualquer navegador. Para usar a atividade, não há dependências nem servidor e ela funciona sem internet. Node.js, pnpm e Playwright são necessários apenas para desenvolver/executar os testes abaixo, não para alunos utilizarem o HTML.

## Tecnologias

HTML, CSS e JavaScript puro, em um único arquivo.

## Testes de interface

A suíte em `tests/interface.spec.cjs` usa Playwright e Chromium real, em dois contextos de tela: computador (1280 × 800) e celular emulado (390 × 844). Cada cenário começa em um contexto isolado, sem dados de alunos, e não depende da ordem dos testes. A atividade testada é o próprio `index.html`; o servidor de teste é local, somente leitura, e nenhuma requisição da página pode sair do laboratório.

| Cobertura | O que é conferido |
|---|---|
| Percurso didático | Feedback inicial de cada desafio e conclusão dos seis pelo fluxo de botões, formulários e questionários |
| Configuração e retorno | Salvar versus Verificar, alterações não salvas, SSID/senha inválidos, segurança nas duas faixas e QoS incompatível com o plano |
| Progresso | Acerto repetido sem duplicação, recarregamento, reset confirmado/cancelado, JSON malformado e armazenamento bloqueado |
| Operação local | Abertura do arquivo com o navegador offline, ativação básica por teclado, ausência de erros JavaScript não tratados e de requisições externas |

Os testes não preenchem variáveis internas como `saved`, `done` ou resultados de `check()`: o percurso interage com os controles reais. A leitura do armazenamento verifica apenas a marcação produzida pela interface. As únicas falhas induzidas são no armazenamento local para exercitar os tratamentos existentes.

Com **Node.js 22 ou superior** e **pnpm 11.25.0** disponíveis, execute na pasta do repositório:

```bash
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm test
```

A primeira instalação de dependências/Chromium precisa de internet. Se faltarem bibliotecas do sistema no Linux, use `pnpm exec playwright install --with-deps chromium`. A execução sobe e encerra seu servidor de testes em `127.0.0.1:4173`; libere essa porta antes de iniciar. Não reutiliza outro servidor que já esteja em execução.

O relatório HTML fica em `playwright-report/` e pode ser aberto com `pnpm test:report`. Rastros e capturas são gerados apenas quando um teste falha; dependências e resultados locais ficam fora do Git. O [workflow de interface](https://github.com/pereirashouse/simulador-configura-o-roteador/actions/workflows/testes-interface.yml) executa a suíte em pushes/PRs da `main`, com lockfile, ações fixadas por commit, duas telas e **zero retentativas**. Os artefatos do relatório ficam disponíveis por sete dias. Consulte a execução e seu commit para a evidência atual; um workflow configurado não é, sozinho, um resultado aprovado.

**Limites:** Chromium e telas emuladas não equivalem a Safari/Firefox, aparelhos físicos ou leitores de tela. A ativação básica por teclado não é auditoria de acessibilidade, contraste ou WCAG. O teste do texto livre confirma o limite atual de 40 caracteres, não sua qualidade semântica. A suíte exercita o artefato local, não disponibilidade do GitHub Pages, funcionamento de equipamentos ou aprendizagem em turma. O código da atividade não precisa ser recompilado nem empacotado para continuar funcionando offline.

## Limitações

- O simulador modela um roteador residencial simplificado; não há DHCP configurável, firewall, VLAN nem atualização de firmware.
- A varredura de redes vizinhas e o log são fixos; todos os alunos veem o mesmo cenário.
- O progresso fica no navegador de cada aluno; o professor não recebe as respostas.

## Próximos passos

- Cenários aleatórios de varredura e de log para cada aluno.
- Painel DHCP (faixa de endereços, reserva) e um desafio de rede de convidados isolada.
- Exportar as respostas do aluno em um arquivo para o professor.

## Autor

Jeferson Luiz Pereira — [github.com/pereirashouse](https://github.com/pereirashouse)
