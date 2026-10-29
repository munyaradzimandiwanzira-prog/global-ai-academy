import type { Level } from '@shared/content';

export interface CareerStage {
  level: 'Entry level' | 'Intermediate' | 'Advanced';
  focus: string;
  trackIds: string[];
  project: string;
}

export interface Career {
  id: string;
  title: string;
  icon: string;
  level: Level; // where the path starts
  summary: string;
  dayToDay: string[];
  tools: string[];
  zimbabwe: string;
  stages: CareerStage[];
  trackIds: string[];
  next: string[];
}

type CareerInput = Omit<Career, 'trackIds'>;

const define = (c: CareerInput): Career => ({ ...c, trackIds: [...new Set(c.stages.flatMap((s) => s.trackIds))] });

export const CAREERS: Career[] = [
  define({
    id: 'python-engineer',
    title: 'Entry-level Python Engineer',
    icon: '🐍',
    level: 'beginner',
    summary: 'Write clean Python that automates work, cleans data and powers small web services. The most common first engineering job — and the foundation for every AI role.',
    dayToDay: ['Write and test Python scripts and small services', 'Automate spreadsheets, reports and file processing', 'Read and fix other people’s code', 'Use Git and code review every day'],
    tools: ['Python 3', 'VS Code', 'Git & GitHub', 'pytest', 'SQLite / PostgreSQL', 'FastAPI'],
    zimbabwe: 'Banks, NGOs, mining houses and agritech start-ups in Harare and Bulawayo hire Python developers to automate reporting, reconciliation and data collection.',
    stages: [
      { level: 'Entry level', focus: 'Programming fundamentals and your tools', trackIds: ['start-here', 'vscode', 'terminal', 'git', 'python'], project: 'A command-line budget tracker that reads and writes CSV files.' },
      { level: 'Intermediate', focus: 'Data and the web', trackIds: ['sql', 'postgresql', 'backend', 'data-science'], project: 'A FastAPI service with a database that tracks market prices across Zimbabwean towns.' },
      { level: 'Advanced', focus: 'Shipping to production', trackIds: ['deployment', 'security'], project: 'Deploy your API with automated tests, CI and monitoring.' },
    ],
    next: ['backend-engineer', 'data-scientist', 'ai-engineer'],
  }),
  define({
    id: 'web-developer',
    title: 'Frontend & Full-stack Web Developer',
    icon: '🌐',
    level: 'beginner',
    summary: 'Build the websites and web apps people use every day — from the page layout to the database behind it.',
    dayToDay: ['Turn designs into responsive pages', 'Build interactive features in JavaScript/TypeScript', 'Connect frontends to APIs', 'Make sites fast on slow connections'],
    tools: ['HTML', 'CSS', 'JavaScript', 'TypeScript', 'React', 'Git', 'Cloudflare'],
    zimbabwe: 'Every business moving online — retailers, schools, churches, tourism operators — needs fast, mobile-first sites that work on limited data bundles.',
    stages: [
      { level: 'Entry level', focus: 'The web platform', trackIds: ['start-here', 'vscode', 'html', 'css', 'javascript', 'git'], project: 'A responsive portfolio site for a local business.' },
      { level: 'Intermediate', focus: 'Apps, types and APIs', trackIds: ['typescript', 'react', 'backend', 'sql', 'postgresql'], project: 'A React booking app for a Victoria Falls tour operator.' },
      { level: 'Advanced', focus: 'Performance, security, deployment', trackIds: ['deployment', 'security', 'networking'], project: 'Ship a full-stack app on Cloudflare with authentication.' },
    ],
    next: ['backend-engineer', 'ai-engineer'],
  }),
  define({
    id: 'backend-engineer',
    title: 'Backend Engineer',
    icon: '🗄️',
    level: 'intermediate',
    summary: 'Design the APIs, databases and services that apps depend on. Reliability, security and data integrity are your job.',
    dayToDay: ['Design REST APIs and data models', 'Write SQL and tune slow queries', 'Handle authentication and payments safely', 'Monitor services in production'],
    tools: ['Python or Java', 'SQL', 'HTTP & REST', 'Docker', 'Linux', 'Git'],
    zimbabwe: 'Fintech and mobile-money integrations, insurance platforms and e-government services all need robust, secure backends.',
    stages: [
      { level: 'Entry level', focus: 'One language well, plus tools', trackIds: ['python', 'terminal', 'git', 'sql'], project: 'A REST API for a school library.' },
      { level: 'Intermediate', focus: 'APIs, networking and security', trackIds: ['backend', 'postgresql', 'networking', 'security'], project: 'A payments-style ledger API with idempotent transactions.' },
      { level: 'Advanced', focus: 'Scale and operations', trackIds: ['deployment', 'java'], project: 'Containerise and deploy a multi-service backend with CI/CD.' },
    ],
    next: ['platform-ai-engineer', 'devops-engineer'],
  }),
  define({
    id: 'java-engineer',
    title: 'Java Engineer',
    icon: '☕',
    level: 'beginner',
    summary: 'Java runs banking cores, telecom systems and Android. Learn the language enterprises trust for large, long-lived systems.',
    dayToDay: ['Build services with object-oriented design', 'Write unit tests', 'Work with relational databases', 'Collaborate in large codebases'],
    tools: ['Java 21', 'IntelliJ IDEA', 'Maven/Gradle', 'JUnit', 'SQL', 'Spring Boot'],
    zimbabwe: 'Banks and telecoms in the region run large Java systems and need engineers who can maintain and modernise them.',
    stages: [
      { level: 'Entry level', focus: 'Java fundamentals', trackIds: ['start-here', 'ides', 'git', 'java'], project: 'A console bank-account simulator with classes and exceptions.' },
      { level: 'Intermediate', focus: 'Data and services', trackIds: ['sql', 'postgresql', 'backend'], project: 'A Spring Boot-style REST service for loan applications.' },
      { level: 'Advanced', focus: 'Production and mobile', trackIds: ['deployment', 'kotlin', 'security'], project: 'Deploy your service and add a Kotlin client.' },
    ],
    next: ['android-engineer', 'backend-engineer'],
  }),
  define({
    id: 'android-engineer',
    title: 'Android Engineer',
    icon: '🤖',
    level: 'intermediate',
    summary: 'Most Zimbabweans are online through an Android phone. Build the apps they use — fast, offline-friendly and light on data.',
    dayToDay: ['Build screens with Jetpack Compose', 'Store data offline and sync later', 'Call APIs and handle poor networks', 'Publish to Google Play'],
    tools: ['Kotlin', 'Android Studio', 'Jetpack Compose', 'Room', 'Retrofit', 'Git'],
    zimbabwe: 'Agritech, health and mobile-money apps must work offline and on entry-level phones — a skill in high demand across Africa.',
    stages: [
      { level: 'Entry level', focus: 'Kotlin and tools', trackIds: ['start-here', 'git', 'kotlin', 'ides'], project: 'A Kotlin console app that tracks farm inputs.' },
      { level: 'Intermediate', focus: 'Android apps', trackIds: ['android', 'backend'], project: 'An offline-first market price app with sync.' },
      { level: 'Advanced', focus: 'Quality, security and AI on device', trackIds: ['security', 'ai-fundamentals', 'deployment'], project: 'Add on-device image classification for crop disease.' },
    ],
    next: ['ai-engineer', 'ios-engineer'],
  }),
  define({
    id: 'ios-engineer',
    title: 'iOS Engineer',
    icon: '🍎',
    level: 'intermediate',
    summary: 'Build polished iPhone and iPad apps with Swift and SwiftUI for the diaspora and international clients.',
    dayToDay: ['Build interfaces with SwiftUI', 'Manage app state and data', 'Integrate APIs and payments', 'Ship through App Store review'],
    tools: ['Swift', 'Xcode', 'SwiftUI', 'Combine/async-await', 'TestFlight'],
    zimbabwe: 'Remote iOS work for international companies is a strong export opportunity for Zimbabwean engineers.',
    stages: [
      { level: 'Entry level', focus: 'Swift and tools', trackIds: ['start-here', 'git', 'ides', 'ios-swift'], project: 'A Swift playground that models a kombi route.' },
      { level: 'Intermediate', focus: 'Apps and APIs', trackIds: ['backend', 'networking'], project: 'A SwiftUI app that lists events in Harare from an API.' },
      { level: 'Advanced', focus: 'Security and AI features', trackIds: ['security', 'llm-apis'], project: 'Add an AI assistant feature with safe API usage.' },
    ],
    next: ['android-engineer', 'ai-engineer'],
  }),
  define({
    id: 'data-scientist',
    title: 'Data Scientist',
    icon: '📊',
    level: 'intermediate',
    summary: 'Turn raw data into decisions: clean it, analyse it, visualise it and build models that predict what happens next.',
    dayToDay: ['Clean and explore datasets with pandas', 'Write SQL against warehouses', 'Build and evaluate ML models', 'Explain findings to non-technical people'],
    tools: ['Python', 'pandas', 'NumPy', 'matplotlib', 'scikit-learn', 'SQL', 'Jupyter'],
    zimbabwe: 'Agriculture yield forecasting, health programme monitoring, mobile-money fraud detection and retail demand all need data scientists.',
    stages: [
      { level: 'Entry level', focus: 'Python and SQL', trackIds: ['python', 'sql', 'ides'], project: 'Analyse rainfall and maize yields by province.' },
      { level: 'Intermediate', focus: 'Analysis and ML', trackIds: ['data-science', 'statistics', 'postgresql', 'machine-learning', 'ai-fundamentals'], project: 'Predict house prices in Harare suburbs.' },
      { level: 'Advanced', focus: 'Production ML', trackIds: ['mlops', 'hugging-face', 'neo4j', 'web-scraping'], project: 'Deploy a model behind an API with monitoring.' },
    ],
    next: ['ml-engineer', 'ai-engineer'],
  }),
  define({
    id: 'ml-engineer',
    title: 'Machine Learning Engineer',
    icon: '🧮',
    level: 'advanced',
    summary: 'Build, train and ship models that work reliably in production — not just in a notebook.',
    dayToDay: ['Train and evaluate models', 'Build data and training pipelines', 'Serve models behind APIs', 'Monitor drift and retrain'],
    tools: ['Python', 'scikit-learn', 'PyTorch', 'Hugging Face', 'Docker', 'MLflow'],
    zimbabwe: 'Local language models (Shona, Ndebele), crop-disease vision and credit scoring are open problems waiting for local ML engineers.',
    stages: [
      { level: 'Entry level', focus: 'Foundations', trackIds: ['python', 'data-science', 'git'], project: 'A clean, reproducible analysis notebook.' },
      { level: 'Intermediate', focus: 'Modelling', trackIds: ['ml-math', 'statistics', 'machine-learning', 'hugging-face', 'ai-fundamentals'], project: 'Fine-tune a text classifier for Shona SMS messages.' },
      { level: 'Advanced', focus: 'Shipping models', trackIds: ['mlops', 'sagemaker', 'inference-engineering', 'deployment', 'backend'], project: 'A versioned model service with CI and monitoring.' },
    ],
    next: ['ai-engineer', 'platform-ai-engineer'],
  }),
  define({
    id: 'ai-engineer',
    title: 'AI Engineer',
    icon: '🧠',
    level: 'intermediate',
    summary: 'Build products on top of large language models: chat assistants, document search, summarisation and automation — safely and cost-effectively.',
    dayToDay: ['Design prompts and evaluate outputs', 'Call LLM APIs with structured outputs', 'Build retrieval (RAG) over company documents', 'Add guardrails and measure quality'],
    tools: ['Python', 'OpenAI API', 'LangChain', 'Vector databases', 'Hugging Face', 'FastAPI'],
    zimbabwe: 'Law firms, banks, insurers and government departments want assistants that answer from their own policies and documents.',
    stages: [
      { level: 'Entry level', focus: 'Python and AI basics', trackIds: ['python', 'ai-fundamentals', 'prompt-engineering', 'git'], project: 'A prompt-engineered study buddy for ZIMSEC revision.' },
      { level: 'Intermediate', focus: 'LLM applications', trackIds: ['llm-apis', 'openai-platform', 'pydantic', 'postgresql', 'rag', 'langchain', 'hugging-face'], project: 'A RAG assistant over a set of public policy PDFs.' },
      { level: 'Advanced', focus: 'Reliability and safety', trackIds: ['guardrails', 'ai-evaluations', 'graphrag', 'ai-agents', 'deployment'], project: 'Add evaluation, guardrails and deployment to your assistant.' },
    ],
    next: ['agentic-ai-engineer', 'platform-ai-engineer'],
  }),
  define({
    id: 'agentic-ai-engineer',
    title: 'Agentic AI Engineer',
    icon: '🦾',
    level: 'advanced',
    summary: 'Design AI agents that plan, call tools and complete multi-step tasks — with the controls that keep them safe.',
    dayToDay: ['Design tools and function-calling schemas', 'Build planning and memory loops', 'Orchestrate multiple agents', 'Evaluate, trace and constrain agent behaviour'],
    tools: ['Python', 'OpenAI tools', 'LangGraph / LangChain', 'MCP', 'Vector stores', 'Observability'],
    zimbabwe: 'Agents that process loan applications, triage customer queries or monitor farms can multiply what small teams can do.',
    stages: [
      { level: 'Entry level', focus: 'Prerequisites', trackIds: ['python', 'python-functions', 'pydantic', 'prompt-engineering', 'llm-apis'], project: 'A tool-calling assistant that checks the weather and exchange rates.' },
      { level: 'Intermediate', focus: 'Agents and retrieval', trackIds: ['ai-agents', 'agentic-engineering', 'mcp', 'rag', 'postgresql', 'langchain'], project: 'A research agent that searches documents and cites sources.' },
      { level: 'Advanced', focus: 'Safety and scale', trackIds: ['graphrag', 'ai-evaluations', 'guardrails', 'agentic-security', 'ai-workflows', 'inference-engineering'], project: 'A multi-agent workflow with human approval steps and evals.' },
    ],
    next: ['platform-ai-engineer', 'lead-platform-ai-engineer'],
  }),
  define({
    id: 'workflow-ai-engineer',
    title: 'Workflow / Automation AI Engineer',
    icon: '⚙️',
    level: 'intermediate',
    summary: 'Connect AI to the tools businesses already use — email, WhatsApp, spreadsheets, CRMs — to automate real work end to end.',
    dayToDay: ['Map business processes', 'Build automations with n8n or code', 'Use webhooks and APIs', 'Add AI steps with human review'],
    tools: ['n8n / Make / Zapier', 'Python', 'Webhooks', 'REST APIs', 'OpenAI API'],
    zimbabwe: 'SMEs run on WhatsApp and spreadsheets — automation that saves hours a week is an immediately sellable skill.',
    stages: [
      { level: 'Entry level', focus: 'Basics', trackIds: ['start-here', 'python', 'prompt-engineering'], project: 'Automate a weekly sales summary email.' },
      { level: 'Intermediate', focus: 'APIs and workflows', trackIds: ['ai-workflows', 'llm-apis', 'backend', 'web-scraping'], project: 'A WhatsApp order-intake workflow with AI extraction.' },
      { level: 'Advanced', focus: 'Agents and safety', trackIds: ['ai-agents', 'mcp', 'guardrails', 'agentic-security', 'security'], project: 'A supervised agent that drafts and files invoices.' },
    ],
    next: ['agentic-ai-engineer'],
  }),
  define({
    id: 'platform-ai-engineer',
    title: 'Platform AI Engineer',
    icon: '🏗️',
    level: 'advanced',
    summary: 'Build the shared platform other teams use to ship AI: model gateways, evaluation, observability, cost control and deployment.',
    dayToDay: ['Run model gateways and routing', 'Build evaluation and monitoring', 'Manage GPUs, costs and quotas', 'Set standards for safe AI use'],
    tools: ['Python', 'Docker', 'Kubernetes', 'MLflow', 'OpenTelemetry', 'Cloud (Cloudflare, AWS)'],
    zimbabwe: 'As local enterprises adopt AI, someone must make it reliable, affordable and compliant — that is this role.',
    stages: [
      { level: 'Entry level', focus: 'Engineering base', trackIds: ['python', 'terminal', 'git', 'backend'], project: 'A small API with logging and tests.' },
      { level: 'Intermediate', focus: 'AI systems', trackIds: ['llm-apis', 'rag', 'postgresql', 'mlops', 'inference-engineering', 'networking'], project: 'An LLM gateway with caching and rate limits.' },
      { level: 'Advanced', focus: 'Production platform', trackIds: ['deployment', 'guardrails', 'security', 'ai-agents', 'ai-evaluations', 'sagemaker'], project: 'An evaluation and observability dashboard for AI services.' },
    ],
    next: ['lead-platform-ai-engineer'],
  }),
  define({
    id: 'lead-platform-ai-engineer',
    title: 'Lead Platform AI Engineer',
    icon: '🏛️',
    level: 'advanced',
    summary: 'Lead the people and architecture behind an organisation’s AI platform: strategy, governance, reliability and mentoring.',
    dayToDay: ['Set AI architecture and standards', 'Plan capacity, cost and vendor strategy', 'Run incident reviews and governance', 'Mentor engineers and align with leadership'],
    tools: ['Architecture design', 'Evaluation frameworks', 'Governance & risk', 'Cloud platforms', 'Team leadership'],
    zimbabwe: 'Leads who understand both global AI and local constraints (connectivity, cost, regulation) will shape how the country adopts AI.',
    stages: [
      { level: 'Entry level', focus: 'Prove the platform skills', trackIds: ['mlops', 'deployment', 'security'], project: 'Document an AI platform architecture for a bank.' },
      { level: 'Intermediate', focus: 'Breadth across AI', trackIds: ['ai-agents', 'agentic-engineering', 'rag', 'guardrails', 'ai-evaluations'], project: 'Run an evaluation programme across three AI products.' },
      { level: 'Advanced', focus: 'Leadership', trackIds: ['networking', 'hugging-face', 'machine-learning'], project: 'Write an AI governance policy and a 12-month platform roadmap.' },
    ],
    next: [],
  }),
  define({
    id: 'ai-security-engineer',
    title: 'AI Security Engineer',
    icon: '🔐',
    level: 'intermediate',
    summary: 'Protect AI products and agents from prompt injection, data leaks and misuse, and help security teams use AI safely.',
    dayToDay: ['Threat-model AI features and agents', 'Design tool permissions, identity and sandboxes', 'Red-team agents and track attack success rates', 'Monitor agent behaviour and respond to incidents'],
    tools: ['Python', 'OWASP Agentic & LLM Top 10', 'MITRE ATLAS', 'OAuth & secrets managers', 'Containers & sandboxes', 'OpenTelemetry'],
    zimbabwe: 'Banks, mobile-money operators and government services are adding AI assistants; each one needs people who can keep customer data and money safe.',
    stages: [
      { level: 'Entry level', focus: 'Security and code foundations', trackIds: ['python', 'networking', 'security', 'terminal'], project: 'Harden a small web app and write its threat model.' },
      { level: 'Intermediate', focus: 'How AI systems work', trackIds: ['llm-apis', 'prompt-engineering', 'ai-agents', 'mcp', 'guardrails'], project: 'Build a tool-calling assistant with input and output guardrails.' },
      { level: 'Advanced', focus: 'Securing agents', trackIds: ['agentic-security', 'ai-evaluations', 'deployment'], project: 'A secure tool gateway with policies, audit logs and a red-team test suite.' },
    ],
    next: ['platform-ai-engineer', 'lead-platform-ai-engineer'],
  }),
  define({
    id: 'network-engineer',
    title: 'Network Engineer',
    icon: '🛰️',
    level: 'beginner',
    summary: 'Keep organisations connected: design, secure and troubleshoot networks from the office LAN to the cloud.',
    dayToDay: ['Configure routers, switches and Wi-Fi', 'Troubleshoot connectivity', 'Secure networks with firewalls and VPNs', 'Automate with scripts'],
    tools: ['TCP/IP', 'DNS', 'Linux', 'Wireshark', 'Python', 'Cloud networking'],
    zimbabwe: 'ISPs, telecoms, schools and businesses need people who can keep links up despite power cuts and limited bandwidth.',
    stages: [
      { level: 'Entry level', focus: 'Fundamentals', trackIds: ['start-here', 'terminal', 'networking'], project: 'Map and document a small office network.' },
      { level: 'Intermediate', focus: 'Security and automation', trackIds: ['security', 'python'], project: 'A Python script that checks uptime of key services.' },
      { level: 'Advanced', focus: 'Cloud', trackIds: ['deployment', 'backend'], project: 'Design a hybrid network with a cloud VPC and VPN.' },
    ],
    next: ['devops-engineer'],
  }),
  define({
    id: 'devops-engineer',
    title: 'DevOps & Cloud Engineer',
    icon: '☁️',
    level: 'intermediate',
    summary: 'Automate how software is built, tested and deployed, and keep it running smoothly in the cloud.',
    dayToDay: ['Build CI/CD pipelines', 'Containerise applications', 'Manage cloud infrastructure', 'Monitor and respond to incidents'],
    tools: ['Linux', 'Git', 'Docker', 'GitHub Actions', 'Cloudflare', 'Terraform'],
    zimbabwe: 'Moving local systems to the cloud — with failover for power and connectivity issues — is a top priority for many organisations.',
    stages: [
      { level: 'Entry level', focus: 'Tools', trackIds: ['terminal', 'git', 'python', 'networking'], project: 'Automate backups with a shell script.' },
      { level: 'Intermediate', focus: 'Delivery', trackIds: ['deployment', 'backend', 'security'], project: 'A CI pipeline that tests and deploys a web app.' },
      { level: 'Advanced', focus: 'AI infrastructure', trackIds: ['mlops'], project: 'Deploy and monitor an ML model service.' },
    ],
    next: ['platform-ai-engineer'],
  }),
  define({
    id: 'mechatronics-engineer',
    title: 'Mechatronics & IoT Engineer',
    icon: '🔧',
    level: 'beginner',
    summary: 'Combine electronics, mechanics and code to build machines that sense and act — from irrigation controllers to robots.',
    dayToDay: ['Wire sensors and actuators', 'Program microcontrollers in C++', 'Send sensor data to the cloud', 'Prototype and test hardware'],
    tools: ['Arduino / ESP32', 'C++', 'Python', 'Sensors & motors', 'MQTT', 'Solar power'],
    zimbabwe: 'Solar-powered smart irrigation, cold-chain monitoring and mine safety sensors are practical, high-impact local projects.',
    stages: [
      { level: 'Entry level', focus: 'Code and circuits', trackIds: ['start-here', 'cpp', 'mechatronics'], project: 'A soil-moisture alarm with an LED and buzzer.' },
      { level: 'Intermediate', focus: 'Connected devices', trackIds: ['python', 'networking'], project: 'An ESP32 weather station that posts data online.' },
      { level: 'Advanced', focus: 'Intelligent machines', trackIds: ['machine-learning', 'ai-fundamentals'], project: 'A line-following robot with obstacle detection.' },
    ],
    next: ['ml-engineer'],
  }),
];

export const getCareer = (id: string) => CAREERS.find((c) => c.id === id);
