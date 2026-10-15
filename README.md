# Wind Resource Editor 🌬️📊
> **Estúdio Moderno de Avaliação de Recurso Eólico (WRA)**  
> *Powered by [BrightWind](https://github.com/brightwind-dev/brightwind) & React + Tailwind + Apache ECharts*

O **Wind Resource Editor** é uma aplicação híbrida de alto nível para análise e tratamento de dados de torres anemométricas (met masts) e LiDAR. Desenvolvido para oferecer o melhor dos dois mundos: a **segurança de dados, privacidade (NDA) e execução local** do **Windographer**, combinados com a **estética moderna, responsividade e gráficos fluidos** das tecnologias Web de ponta.

---

## 🚀 Como Executar

### 1. Modo Desktop (Janela Nativa Windows)
Para abrir diretamente como um programa de computador:
```powershell
python run_app.py --desktop
```
*Ou simplesmente dê um duplo clique no arquivo `start_desktop.bat`.*

### 2. Modo Servidor Web (Localhost / Intranet / Docker)
Para servir em rede local ou disponibilizar para outros engenheiros da equipe:
```powershell
python run_app.py --server
```
Acesse em seu navegador: `http://localhost:8000`

### 3. Modo Desenvolvimento (HMR no Frontend + Auto-reload no Backend)
```powershell
python run_app.py --dev
```
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000/docs`

---

## 🏗️ Arquitetura do Projeto

```
Wind Resource Editor/
├── backend/                        # Serviço Python & Motor BrightWind
│   ├── main.py                     # API REST FastAPI + Servidor estático
│   ├── services/
│   │   └── brightwind_service.py   # Módulo de cálculo (Shear, TI, Rose, QC, WAsP)
│   └── uploads/                    # Diretório local para arquivos de medição enviados
├── frontend/                       # Interface Web Moderna (React + Vite + TypeScript)
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.tsx          # Cabeçalho com indicador de torre e abas
│   │   │   ├── DatasetModal.tsx    # Seletor de datasets e upload de arquivos
│   │   │   └── tabs/
│   │   │       ├── DataTab.tsx     # Mapeamento de canais, alturas e disponibilidade
│   │   │       ├── QCTab.tsx       # Controle de qualidade & série temporal interativa
│   │   │       ├── AnalysisTab.tsx # Rosa dos Ventos, Shear, Turbulência IEC, 12x24, Weibull
│   │   │       └── ExportTab.tsx   # Exportação WAsP (.tab) e CSV limpo
│   │   ├── services/api.ts         # Cliente HTTP tipado para a API
│   │   └── types/index.ts          # Interfaces TypeScript
│   └── dist/                       # Build estático de produção incorporado ao executável
├── run_app.py                      # Launcher unificado (Desktop / Web / Dev)
├── start_desktop.bat               # Atalho executável do Windows
└── README.md
```

---

## ⚡ Módulos Implementados

### 1. Dados & Torre (`DataTab`)
- Importação automática de arquivos CSV, Campbell Scientific CR1000 e Windographer TXT.
- Classificação inteligente de canais: Anemômetros (velocidade m/s, desvio padrão, rajadas), Palhetas (direção), Termômetros (°C) e Barômetros (hPa).
- Detecção automática de cotas de medição (alturas) e orientação dos braços/estais da torre (N, S, E, W).
- Matriz de disponibilidade (*coverage %*) por sensor e cálculo de velocidades médias de topo.

### 2. Controle de Qualidade & Séries Temporais (`QCTab`)
- Visualizador interativo de alta taxa de quadros (FPS) com zoom suave, slider temporal e ferramenta de inspeção.
- Motor de regras de filtragem:
  - **Limites de velocidade**: Mínimo e máximo físico ($0 \le v \le 45$ m/s).
  - **Sombra de Torre (*Mast Shadow*)**: Eliminação de setores onde os anemômetros sofrem esteira da estrutura da torre.
  - **Detecção de Gelo & Sensores Travados**: Filtragem por temperatura subzero combinada com estagnação do desvio padrão.
- Painel em tempo real de estatísticas de flags (registros válidos vs. descartados).

### 3. Análises Eólicas Especializadas (`AnalysisTab`)
- **Rosa dos Ventos Interativa**: Projeção polar com empilhamento de classes de velocidade (0-3, 3-6, 6-9, 9-12, 12-15, >15 m/s) e tabela setorial de médias e frequências.
- **Perfil de Cisalhamento Vertical (*Wind Shear*)**: Ajuste de Lei de Potência (Power Law $\alpha$) e Lei Logarítmica (Rugosidade $z_0$) com extrapolação contínua para alturas de cubo (*Hub Heights* de 100m a 160m) e cálculo de ganho de velocidade.
- **Turbulência IEC 61400-1**: Curvas de TI Característica (percentil 90) e Média por *bin* de velocidade com sobreposição normativa dos modelos NTM das Classes A, B e C.
- **Matriz Diurna-Sazonal (12x24 Heatmap)**: Mapeamento de calor relacionando os 12 meses do ano com as 24 horas do dia para visualização dos regimes de vento.
- **Distribuição de Weibull**: Histograma empírico com curva contínua de densidade de probabilidade (PDF), fator de forma $k$ e fator de escala $c$.

### 4. Exportação & Entregáveis (`ExportTab`)
- Geração de arquivos `.tab` no padrão oficial **WAsP**, prontos para simulações no WAsP, Openwind e WindPRO.
- Exportação de séries temporais limpas em CSV pós-tratamento de controle de qualidade.
- Ficha técnica consolidada da campanha de medição.
