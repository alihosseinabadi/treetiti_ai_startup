const tr = {
  nav: {
    services: "Hizmetler",
    about: "Hakkımızda",
    process: "Süreç",
    contact: "İletişim",
    getInTouch: "İletişime Geç",
    home: "Treetiti ana sayfa",
    main: "Ana navigasyon",
  },
  hero: {
    badge: "Zekâ Yeniden Tanımlandı",
    cta: "Çalışmalarımız",
    scroll: "Keşfet",
    countries: "Pazarlar",
    aiSystems: "Sistem Devrede",
    satisfaction: "Müşteri Memnuniyeti",
    projects: [
      {
        title: "Nöral Marka Sistemleri",
        category: "YZ İçerik ve UGC",
        description: "Öğrenen, uyum sağlayan ve üreten otonom marka ekosistemleri — yapay zekânın sınırında özgün içerik üretimi.",
      },
      {
        title: "Üretken Mimarlık",
        category: "YZ Tasarım ve 3B",
        description: "Algoritmalar mimar oluyor. Yapılı çevreyi yeniden tanımlayan akıllı mekân tasarımı ve 3B üretim.",
      },
      {
        title: "Sinematik Deneyimler",
        category: "YZ Web Siteleri",
        description: "Ekranın ötesine geçen dijital deneyimler. Sürükleyici, yüksek performanslı, unutulmaz.",
      },
      {
        title: "Otonom Zekâ",
        category: "YZ Otomasyonu",
        description: "Karmaşıklığı yöneten ajan sistemleri. Sonsuz ölçekte uçtan uca otomasyon.",
      },
    ],
  },
  about: {
    scene0: "Biz sadece web sitesi yapmıyoruz.",
    scene1: "Biz sadece uygulama geliştirmiyoruz.",
    scene2: "İş dünyasının geleceğini inşa ediyoruz",
    scene2Accent: "— yapay zekâ gücüyle.",
    scene3: {
      projects: "Tamamlanan Proje",
      uptime: "Çalışma Süresi",
      performance: "Performans Artışı",
    },
    scene4: "Startup'lardan kurumsal şirketlere — düşünen, uyum sağlayan ve büyüyen sistemler inşa ediyoruz.",
  },
  showcase: {
    heading: "Ürünlerimiz",
    headingAccent: "",
    featured: "Öne Çıkan Çalışmalar",
    viewProject: "Projeyi Gör",
    stats: {
      projects: "Tamamlanan Proje",
      performance: "Performans Artışı",
      uptime: "Sistem Çalışma Süresi",
      retention: "Müşteri Memnuniyeti",
    },
    projects: [
      {
        title: "Akıllı Otomasyon Paketi",
        description: "Kurumsal düzeyde YZ otomasyonu ile departmanlar arası karmaşık iş akışlarını yönetir. Operasyonel yükü %60 azaltırken tam uyumluluk sağlar.",
        category: "Kurumsal YZ",
        tech: ["LangGraph", "n8n", "Supabase", "GPT-4o"],
      },
      {
        title: "Sinematik YZ Arayüzleri",
        description: "Akıllı ajanlarla iş süreçlerini otomatize eden uçtan uca YZ sistemi. Gerçek zamanlı karar alma ile platformlar arası sorunsuz entegrasyon sunar.",
        category: "YZ Otomasyonu",
        tech: ["AutoGen", "Python", "Docker", "OpenAI"],
      },
      {
        title: "Otonom İş Akışı Motoru",
        description: "İş süreçlerini otonom olarak tasarlayan, devreye alan ve optimize eden çoklu ajan sistemi. İnsan müdahalesi olmadan günde milyonlarca olayı işler.",
        category: "Altyapı",
        tech: ["CrewAI", "Redis", "PostgreSQL", "Claude 3.5"],
      },
      {
        title: "Gerçek Zamanlı YZ Analitiği",
        description: "Saniyede milyonlarca veri noktasını işleyen akış analitiği platformu. Milisaniyeler içinde tahmine dayalı içgörüler ve anomali tespiti sunar.",
        category: "Veri Zekâsı",
        tech: ["Kafka", "Vector DB", "TensorFlow", "React"],
      },
    ],
  },
  process: {
    heading: "İşletmenize",
    headingAccent: "YZ Entegrasyonu",
    subtitle: "Her proje dört aşamalı çerçevemizi takip eder. Her aşama bir öncekinin üzerine inşa edilir ve sistemleriniz olgunlaştıkça değer katar.",
    steps: [
      {
        num: "01",
        title: "Keşif",
        subtitle: "Derinlemesine Analiz ve Fırsat Haritası",
        desc: "İşinize dalıyoruz — verileri, operasyonları ve hedefleri analiz ediyoruz. Her fırsat potansiyel yatırım getirisine göre ölçülüyor. Varsayım yok, yalnızca kanıt.",
        metrics: ["Veri Denetimi", "Süreç Haritası", "ROI Modellemesi"],
      },
      {
        num: "02",
        title: "Strateji",
        subtitle: "Mimari ve Yol Haritası",
        desc: "Hedeflerinize göre uyarlanmış kapsamlı bir YZ planı. Teknoloji yığını, veri mimarisi, ajan tasarımı ve dağıtım aşamaları — her şey ilk günden ölçeklenebilirlikle planlanır.",
        metrics: ["Teknoloji Yığını", "Ajan Tasarımı", "Yol Haritası"],
      },
      {
        num: "03",
        title: "Geliştirme ve Dağıtım",
        subtitle: "Hızlı Geliştirme ve Yayına Alma",
        desc: "YZ ajanları, otomasyon sistemleri ve akıllı iş akışlarını haftalar içinde geliştiriyoruz, aylar değil. Her sistem yayına girdiği an üretime hazır.",
        metrics: ["Ajan Geliştirme", "Entegrasyon", "Dağıtım"],
      },
      {
        num: "04",
        title: "Ölçeklendirme",
        subtitle: "Sürekli Gelişim ve Büyüme",
        desc: "Öğrenen, uyum sağlayan ve değeri katlayan sistemler. Sürekli optimizasyon ve genişleme — YZ'niz işinizle birlikte büyür ve artan getiri sağlar.",
        metrics: ["Performans Ayarı", "Özellik Genişletme", "7/24 İzleme"],
      },
    ],
  },
  services: {
    heading: "İşletmenizi Dönüştürmek",
    headingAccent: "İhtiyacınız Olan Her Şey",
    headingEnd: "YZ ile",
    subtitle: "Birlikte çalışmak üzere tasarlanmış, kuruluşunuzun her katmanını dönüştüren eksiksiz bir YZ yetenekleri ekosistemi.",
    list: [
      { title: "YZ Web Tasarımı", desc: "Düşünen, uyum sağlayan ve dönüştüren yeni nesil web siteleri. Her pikseli gerçek zamanlı tasarlayan YZ ajanlarıyla." },
      { title: "YZ Otomasyonu", desc: "Kuruluşunuzdaki tekrarlayan işleri tamamen ortadan kaldırın. İş akışlarını, veriyi ve karmaşık kararları makine hızında yürüten özel YZ otomasyonu." },
      { title: "YZ İş Akışları", desc: "Tüm işletmenizi akıllı iş akışı sistemleriyle yönetin. İnsan gözetimi olmadan karmaşık süreçleri yürüten çok adımlı, çok ajanlı yapılar." },
      { title: "YZ Sistemleri", desc: "YZ çağı için akıllı sistem mimarisi. İşletmenizle birlikte öğrenen, uyum sağlayan ve sorunsuz ölçeklenen özel altyapı." },
      { title: "YZ UGC İçeriği", desc: "Özgün kullanıcı içeriği üreten gerçekçi YZ yaratıcıları. İnsan gibi hissettiren sanal fenomenler, ürün referansları ve marka hikâyeleri." },
      { title: "YZ Pazarlama", desc: "Analiz eden, tahmin eden ve harekete geçen tam kanal YZ pazarlaması. Her kanalda kendini gerçek zamanlı optimize eden kampanyalar." },
      { title: "YZ İçerik Üretimi", desc: "Ölçekte premium, marka uyumlu içerik. Liderlik makalelerinden sosyal medyaya — YZ'niz etkileşim yaratan içerikler üretir." },
      { title: "YZ Markalaşma", desc: "Pazarınızla evrilen akıllı markalaşma. YZ destekli kimlik sistemleri, dinamik logo üretimi ve veri odaklı marka stratejisi." },
      { title: "YZ Satış Sistemleri", desc: "7/24 potansiyel müşteri bulan, besleyen ve kapatan YZ satış ajanları. İnsan düzeyinde ikna ile kesintisiz satış hattı." },

      { title: "YZ Video Prodüksiyonu", desc: "Uçtan uca YZ video prodüksiyonu. Konseptten senaryoya, kurgudan finale — YZ yaratıcı sürecin her karesini hızlandırır." },
      { title: "YZ İş Altyapısı", desc: "YZ destekli organizasyonunuzun omurgası. Akıllı operasyonlar, veri hatları ve model dağıtımı için güvenli, ölçeklenebilir altyapı." },
      { title: "YZ Danışmanlığı", desc: "Üst düzey yöneticiler için stratejik YZ danışmanlığı. Yol haritaları, mimari kararları ve uygulama rehberliği, ölçekte teslimat yapmış uzmanlardan." },
    ],
  },
  serviceModal: {
    benefits: "Faydalar",
    workflow: "İş Akışı",
    step: "Adım",
    technologies: "Teknolojiler",
    faq: "SSS",
    discussThisService: "Bu Hizmeti Görüşün",
    close: "Kapat",
  },
  caseStudyModal: {
    client: "Müşteri:",
    timeline: "Süreç:",
    overview: "Genel Bakış",
    challenge: "Zorluk",
    solution: "Çözüm",
    results: "Sonuçlar",
    technologies: "Teknolojiler",
    gallery: "Galeri",
    close: "Kapat",
  },
  imageLightbox: {
    imageGallery: "Resim Galerisi",
    imageOf: "Resim",
    of: "/",
    previous: "Önceki resim",
    next: "Sonraki resim",
    zoomOut: "Uzaklaştır",
    zoomIn: "Yakınlaştır",
    close: "Kapat",
  },
  videoPlayer: {
    videoPlayer: "Video Oynatıcı",
    pause: "Duraklat",
    play: "Oynat",
    replay: "Tekrar Oynat",
    exitFullscreen: "Tam Ekrandan Çık",
    fullscreen: "Tam Ekran",
    close: "Kapat",
  },
  whySection: {
    line0: "Biz sadece web sitesi yapmıyoruz.",
    line1: "Biz sadece uygulama geliştirmiyoruz.",
    line2: "Akıllı dijital",
    line3: "deneyimler inşa ediyoruz.",
    subtitle: "Startup'lardan kurumsal şirketlere — düşünen, uyum sağlayan ve büyüyen sistemler inşa ediyoruz.",
  },
  cinematicHome: {
    badge: "Zekâ Yeniden Tanımlandı",
    tagline: "Branding and Trending",
    theFuture: "Akıllı Sistem",
    heroSubtitle: "Hayal gücünün altyapıyla buluştuğu yer. Geleceği bugünden inşa edenler için YZ destekli iş sistemleri geliştiriyoruz.",
    startYourProject: "Projene Başla",
    scrollToExplore: "Keşfet",
    chapter02: "Bölüm 02",
    chapter03: "Bölüm 03",
    chapter04: "Bölüm 04",
    chapter05: "Bölüm 05",
    chapters: [
      { number: "01", title: "Gelecek", subtitle: "Premium YZ Ajansı" },
      { number: "02", title: "Zekâ", subtitle: "Düşünen sistemler" },
      { number: "03", title: "Üretim", subtitle: "Büyüleyen içerik" },
      { number: "04", title: "Otomasyon", subtitle: "Sizin için çalışan işler" },
      { number: "05", title: "Dönüşüm", subtitle: "Anlamlı sonuçlar" },
    ],
    chapterServices: {
      2: [
        { title: "YZ Sistemleri", desc: "YZ çağı için akıllı mimari" },
        { title: "YZ İş Altyapısı", desc: "YZ destekli organizasyonların omurgası" },
        { title: "YZ Danışmanlığı", desc: "Uzmanlardan stratejik rehberlik" },
      ],
      3: [
        { title: "YZ Web Tasarımı", desc: "Düşünen ve uyum sağlayan web siteleri" },
        { title: "YZ Markalaşma", desc: "Akıllı kimlik sistemleri" },
        { title: "YZ İçerik Üretimi", desc: "Ölçekte premium içerik" },
        { title: "YZ UGC", desc: "Gerçekçi YZ yaratıcıları" },
        { title: "YZ Video Prodüksiyonu", desc: "Yayın kalitesi, YZ hızı" },

      ],
      4: [
        { title: "YZ Otomasyonu", desc: "Tekrarlayan işleri ortadan kaldırın" },
        { title: "YZ İş Akışları", desc: "Akıllı süreç orkestrasyonu" },
        { title: "YZ Satış Sistemleri", desc: "7/24 satış yapan YZ ajanları" },
        { title: "YZ Pazarlama", desc: "Tam kanal YZ kampanyaları" },
      ],
    },
    intelligenceDesc: "Düşünen, öğrenen ve evrilen YZ sistemleri tasarlıyoruz — ham veriyi iş avantajına dönüştürüyoruz.",
    creationDesc: "Sinematik web sitelerinden YZ üretimi içeriğe — büyüleyen ve dönüştüren dijital deneyimler tasarlıyoruz.",
    automationDesc: "Orkestra eden iş akışları, optimize eden sistemler ve yürüten ajanlar — işletmeniz makine hızında çalışıyor.",
    transformationDesc: "Ölçülebilir etki. Startup'lardan kurumsal şirketlere müşterilerimiz, sektörlerinde yeni standartlar belirleyen sonuçlar elde ediyor.",
    stats: [
      { value: "25+", label: "YZ Sistemi Devrede", desc: "Üretime hazır zekâ" },
      { value: "%98", label: "Müşteri Memnuniyeti", desc: "Tüm projeler genelinde" },
      { value: "12+", label: "Hizmet Verilen Ülke", desc: "Küresel teslimat kapasitesi" },
      { value: "%100", label: "Çalışma Garantisi", desc: "Kurumsal düzeyde güvenilirlik" },
    ],
    finalCta: "Kendinizinkini inşa etmeye hazır mısınız?",
    finalDesc: "Her dönüşüm bir konuşmayla başlar. Vizyonunuzu anlatın, biz onu gerçeğe dönüştürecek zekâyı inşa edelim.",
    beginYourJourney: "Yolculuğuna Başla",
  },
  scene03: {
    heading: "YZ Web Siteleri",
    steps: [
      { title: "Tel Kafes", desc: "Mimari ve yapı" },
      { title: "Bileşenler", desc: "UI öğeleri ve etkileşimler" },
      { title: "İçerik", desc: "Metin, medya ve markalaşma" },
      { title: "Animasyon", desc: "Hareket ve geçişler" },
      { title: "Panel", desc: "Yönetim ve analitik" },
      { title: "Mobil", desc: "Duyarlı deneyim" },
      { title: "Ekosistem", desc: "Eksiksiz YZ sistemi" },
    ],
  },
  scene04: {
    heading: "YZ Otomasyonu",
    nodes: [
      { label: "Tetikleyici", desc: "Olay algılandı" },
      { label: "YZ Ajanı", desc: "Karar motoru" },
      { label: "CRM Güncelleme", desc: "Kayıt oluşturuldu" },
      { label: "WhatsApp", desc: "Mesaj gönderildi" },
      { label: "E-posta", desc: "Kampanya tetiklendi" },
      { label: "Analitik", desc: "Panel güncellendi" },
    ],
  },
  scene05: {
    heading: "Markalaşma",
    items: [
      { label: "Kimlik", desc: "Marka stratejisi ve konumlandırma" },
      { label: "Tipografi", desc: "Özel yazı tipi sistemi" },
      { label: "Palet", desc: "Renk mimarisi" },
      { label: "Hareket", desc: "Animasyon dili" },
      { label: "Ses", desc: "Ton ve mesajlaşma" },
    ],
  },

  scene07: {
    label: "YZ YARATICI ÜRETİM HATTI",
    step: "Adım",
    prevSlide: "Önceki slayt",
    nextSlide: "Sonraki slayt",
    steps: [
      { title: "Müşteri Ürünü", subtitle: "Ürününüz", desc: "Ürününüzle başlıyoruz. Premium sunum." },
      { title: "YZ Analizi", subtitle: "Akıllı Tarama", desc: "YZ kompozisyon, ışık ve yapıyı analiz eder." },
      { title: "YZ UGC", subtitle: "YZ Ürünle Buluşuyor", desc: "Ürününüz gerçekçi bir YZ yaratıcısıyla buluşuyor." },
      { title: "Kampanya Varlıkları", subtitle: "Tam Paket", desc: "Her format. Her platform. Tek ekosistem." },
      { title: "Final Kampanyası", subtitle: "Tam Ekosistem", desc: "Ürün. UGC. Site. Marka. Sosyal. Tek çözüm." },
    ],
    campaignCards: [
      { label: "Instagram Gönderisi" },
      { label: "TikTok Videosu" },
      { label: "Web Sitesi Banner" },
      { label: "Hikaye Reklamı" },
      { label: "Ürün Sayfası" },
      { label: "Reklam Sahnesi" },
    ],
    ugcSlides: [
      { label: "YZ UGC Oluşturma" },
      { label: "YZ UGC Oluşturma" },
      { label: "YZ UGC Oluşturma" },
      { label: "Marka Ekosistemi" },
    ],
  },
  scene08: {
    heading: "İş Akışımız",
    steps: [
      { title: "Keşif", desc: "Markanızın, hedef kitlenizin ve hedeflerinizin derinlemesine analizi" },
      { title: "Strateji", desc: "Hedeflerinize uygun özel YZ planı oluşturma" },
      { title: "Tasarım", desc: "Görsel kimlik ve kullanıcı deneyimi oluşturma" },
      { title: "Geliştirme", desc: "YZ sistemlerinizi her aşamada test ederek oluşturma" },
      { title: "Yayın", desc: "İzleme, optimizasyon ve performans ayarı ile canlıya alma" },
      { title: "Büyüme", desc: "YZ ekosisteminizin sürekli iyileştirilmesi ve ölçeklenmesi" },
    ],
  },
  scene08Assistant: {
    name: "Treet AI",
    subtitle: "İstek özeti",
    status: "Çevrimiçi",
    poweredBy: "Groq · Llama 3 tarafından desteklenmektedir",
    welcomeTitle: "Bana her şeyi sorabilirsiniz",
    welcomeSubtitle: "Hizmetler, süreçler, fiyatlandırma — yardımcı olmak için buradayım.",
    quickPrompts: [
      "Benim için neler inşa edebilirsiniz?",
      "Bir proje ne kadar sürer?",
      "Maliyeti nedir?",
      "Nasıl başlarım?",
    ],
    placeholder: "Treet AI'ye sorun...",
    open: "Treet AI'ye sor",
    close: "Kapat",
    footerHint: "Ücretsiz yapay zeka danışmanı · canlı yanıtlar",
    error: "Şu anda bağlanamıyorum. Lütfen birazdan tekrar deneyin.",
    typePrompt: "canlı yanıtlar",
  },
  scene09: {
    heading: "Müşteri Yolculuğu",
    desc: "Her ortaklık, vizyondan gerçeğe kanıtlanmış bir yolu izler.",
    phases: [
      { title: "Danışmanlık", time: "1. Hafta", desc: "Vizyonunuzu, zorluklarınızı ve hedeflerinizi anlamak için derin keşif" },
      { title: "Teklif", time: "1-2. Hafta", desc: "Zaman çizelgesi, bütçe ve beklenen sonuçlarla özel çözüm" },
      { title: "Başlangıç", time: "2. Hafta", desc: "Ekip kurulumu, kaynak tahsisi ve proje başlangıcı" },
      { title: "Oluşturma", time: "2-6. Hafta", desc: "Haftalık incelemelerle çevik geliştirme" },
      { title: "Teslimat", time: "6. Hafta", desc: "Kapsamlı dokümantasyon ve eğitimle canlıya alma" },
      { title: "Büyüme", time: "Sürekli", desc: "YZ ekosisteminizin sürekli optimizasyonu ve gelişimi" },
    ],
  },
  scene10: {
    headingLine1: "Projenizi",
    headingLine2: "oluşturmaya hazır mısınız?",
    footer: "TREETITI — PREMIUM YZ STÜDYOSU",
  },
  cineCta: {
    headingLine1: "Gelecek beklemiyor.",
    headingLine2: "Şimdiden inşa ediliyor.",
    subtitle: "YZ Sistemleri. Otomasyon. Web Deneyimleri. İçerik. Marka Zekası.",
    startProject: "Projenize Başlayın",
    viewOurWork: "Çalışmalarımızı Görün",
  },
  cineStory: {
    heading: "Hikaye",
    chapters: [
      { subtitle: "Başlangıç", desc: "Fikir basit bir gözlemden doğdu: YZ her şeyi değiştiriyor, ama çoğu şirket nereden başlayacağını bilmiyor." },
      { subtitle: "Vizyon", desc: "YZ'nin sadece bir araç değil, stratejik bir ortak olduğu bir dünya hayal ettik." },
      { subtitle: "İnşa", desc: "Hayal ettiğimizi inşa etmek için en iyi mühendisleri ve tasarımcıları bir araya getirdik." },
      { subtitle: "Gelecek", desc: "Bugün, şirketlerin YZ ile mümkün olanın sınırlarını zorlamasına yardımcı oluyoruz." },
    ],
  },
  cineIntro: {
    brand: "TREETITI",
    subtext: "YAPAY ZEKA AJANSI",
  },
  ugcSection: {
    label: "YZ UGC",
    items: [
      { title: "UGC Markalaşma", desc: "Her temas noktasında kimlik, güven ve tanınırlık oluşturan özgün YZ marka içeriği." },
      { title: "YZ Mimarisi ve 3D YZ", desc: "YZ destekli akıllı mekansal tasarım ve 3D model üretimi. Konseptten sürükleyici ortamlara." },
      { title: "Sinematik Web Siteleri", desc: "Scroll hikaye anlatımı ve sinematik hareket tasarımına sahip premium, yüksek performanslı web siteleri." },
    ],
    headers: ["Ölçekte İçerik", "YZ ile"],
    subtitle: "Dakikalar içinde yüzlerce profesyonel video. YZ, senaryo yazımını, prodüksiyonu ve optimizasyonu üstlenir.",
    cta: "Platformu Çalışırken Görün",
    videos: [
      "UGC Kampanyası — Marka A",
      "UGC Kampanyası — Marka B",
      "UGC Kampanyası — Marka C",
      "UGC Kampanyası — Marka D",
    ],
  },
  neuralNetwork: {
    line1: "Her akıllı sistem anlamakla başlar.",
    line2: "Tek bir satır kod yazmadan önce haritalar, tasarlar ve bağlantıları kurarız.",
  },
  ideaToSystem: {
    steps: [
      { title: "Fikir", desc: "Her şeyi değiştiren bir kıvılcım." },
      { title: "Araştırma", desc: "Veri, desenler ve olasılıklar." },
      { title: "Tasarım", desc: "İleriye dönük düşünen mimari." },
      { title: "Otomasyon", desc: "Kendi kendine çalışan zekâ." },
      { title: "Dağıtım", desc: "Canlı. Öğrenen. Evrilen." },
      { title: "Büyüme", desc: "Zamanla katlanan değer." },
    ],
  },
  projectShowcase: {
    projects: [
      { title: "UGC Markalaşma", tag: "YZ UGC", desc: "Özgün YZ üretimi marka içeriği.", metric: "4.2x Etkileşim" },
      { title: "YZ Mimari Tasarım", tag: "YZ Tasarım", desc: "Akıllı mekân ve 3B model üretimi.", metric: "%60 Daha Hızlı" },
      { title: "Sinematik Web Siteleri", tag: "YZ Web Siteleri", desc: "Premium, yüksek performanslı YZ siteleri.", metric: "3x Dönüşüm" },
      { title: "Otomasyon İş Akışı", tag: "YZ Otomasyonu", desc: "Ölçekte uçtan uca orkestrasyon.", metric: "%98 Doğruluk" },
    ],
  },
  horizontalGallery: {
    items: [
      { title: "Sinir Arayüzü", tag: "UX Tasarımı", desc: "İnsan niyeti ile makine hassasiyetinin buluştuğu nokta...", metric: "3.2x" },
      { title: "Otonom Hat", tag: "YZ Sistemleri", desc: "Kendini tasarlayan, yürüten ve optimize eden iş akışları...", metric: "%99.9" },
      { title: "Canlı İçerik", tag: "YZ Medya", desc: "Kendini üreten, test eden ve iyileştiren içerik...", metric: "8x" },
      { title: "Bilişsel Güvenlik", tag: "Altyapı", desc: "İleriye dönük düşünen tehdit algılama...", metric: "0.3ms" },
      { title: "Mekânsal Zekâ", tag: "YZ Tasarım", desc: "Uzayı, ışığı ve hareketi anlayan 3B ortamlar...", metric: "60fps" },
      { title: "Sonsuz Bellek", tag: "Veri Sistemleri", desc: "Asla unutmayan kalıcı bağlam...", metric: "∞" },
    ],
  },
  horizontalScroll: {
    headingLine1: "Performans için üretildi.",
    headingLine2: "Ölçek için tasarlandı.",
    features: [
      { title: "Akıllı Ajanlar", desc: "İş akışlarınızı öğrenen ve insan müdahalesi olmadan yürüten otonom YZ ajanları.", stat: "10x", statLabel: "Verimlilik" },
      { title: "Otomatik Hatlar", desc: "Araçlarınızı birbirine bağlayan, verileri işleyen ve manuel girdi gerektirmeden harekete geçen tam otomasyon.", stat: "%99.9", statLabel: "Güvenilirlik" },
      { title: "Gerçek Zamanlı Analitik", desc: "Anlık olarak desenleri, anomalileri ve fırsatları ortaya çıkaran panolar ve uyarılar.", stat: "< 1sn", statLabel: "Gecikme" },
      { title: "Ölçeklenebilir Altyapı", desc: "Sizinle büyüyen bulut mimarisi. Prototipten kurumsala günler içinde, aylar değil.", stat: "∞", statLabel: "Ölçek" },
    ],
  },
  scrollMarquee: {
    heading: "YZ yeteneklerinin tam spektrumu.",
    items: ["Akıllı Ajanlar", "Akıllı Otomasyon", "YZ Tasarım", "Veri Mühendisliği", "Tahmine Dayalı Analitik", "360 Sanal Tur", "Akıllı Değerlendirme", "YZ Alım Satım", "Bilgisayarlı Görü", "ML Operasyonları"],
  },
  livingEcosystem: {
    heading: "Eksiksiz bir YZ ekosistemi",
    subtitle: "Her yetenek birlikte çalışmak üzere tasarlandı.",
    capabilities: ["YZ Web Siteleri", "YZ Sistemleri", "YZ Otomasyonu", "YZ UGC", "YZ Markalaşma", "YZ İçerik"],
  },
  neuralInterface: {
    heading: "Sinir Arayüzü",
    subtitle: "UX Tasarımı",
    desc: "İnsan niyeti ile makine hassasiyetinin buluştuğu nokta...",
  },
  cta: {
    tagline: "Yolculuğunuza başlayın",
    heading: "Olağanüstü bir şey",
    headingAccent: "inşa etmeye hazır mısınız?",
    description: "Bir sonraki YZ deneyiminizi birlikte yaratalım.",
    button: "Projenize Başlayın",
    learnMore: "Daha Fazla Bilgi",
  },
  packages: {
    heading: "Paketinizi",
    headingAccent: "Seçin",
    subtitle: "Her çözüm işletmenize göre uyarlanır. Kişisel danışmanlık için bizimle iletişime geçin.",
    list: [
      {
        name: "Başlangıç",
        tagline: "YZ Destekli Temel",
        features: ["YZ Web Tasarımı", "Akıllı Sohbet", "Temel Otomasyon", "Tek Ajan Kurulumu", "Standart Destek"],
      },
      {
        name: "UGC Pazarlama",
        tagline: "Özgün YZ İçeriği",
        features: ["Sanal Fenomenler", "Ürün Referans Videoları", "UGC İçerik Hattı", "Çok Platformlu Dağıtım", "Marka Hikâyesi Kampanyaları"],
      },
      {
        name: "Profesyonel",
        tagline: "Tam YZ Dönüşümü",
        features: ["YZ Web + UGC", "Çoklu Ajan İş Akışları", "CRM ve Analitik Paneli", "WhatsApp ve Telegram Botları", "Öncelikli Destek"],
      },
      {
        name: "YZ Mimarisi",
        tagline: "Özel Sistem Tasarımı",
        features: ["YZ Sistem Mimarisi", "LangGraph Ajan Ağları", "n8n Otomasyonu", "Supabase Veri Hattı", "Altyapı Ölçeklendirme"],
      },
      {
        name: "Kurumsal",
        tagline: "Özel YZ Ekosistemi",
        features: ["Profesyonel Paketin Tamamı", "Tam YZ Yığını + Mimari", "Özel Altyapı", "YZ Avatar ve Video Hattı", "7/24 Özel Destek"],
      },
    ],
    cta: "Danışmanlık Alın",
  },
  contact: {
    heading: ["İşletmenizi", "YZ", "ile", "dönüştürmeye", "hazır", "mısınız?"],
    paragraph: "Bir konuşma başlatalım. YZ mimarları ve mühendislerinden oluşan ekibimiz sizinle geleceği inşa etmeye hazır.",
    cta: "Konuşmayı Başlatın",
    email: "hellotreetiti@gmail.com",
    form: {
      name: "Ad Soyad",
      email: "E-posta",
      company: "Şirket",
      service: "İlgilendiğiniz Hizmet",
      message: "Mesaj",
      submit: "Gönder",
    },
    placeholders: {
      name: "Ahmet Yılmaz",
      email: "ahmet@company.com",
      company: "Şirket adı (isteğe bağlı)",
      service: "Bir hizmet seçin...",
      message: "Projeniz, hedefleriniz ve zaman çizelgeniz hakkında bilgi verin...",
    },
    errors: {
      name: "Lütfen adınızı girin",
      email: "Lütfen geçerli bir e-posta adresi girin",
      message: "Lütfen bir mesaj yazın",
      submit: "Bir sorun oluştu. Lütfen tekrar deneyin.",
    },
    success: {
      title: "Mesaj Başarıyla Gönderildi!",
      message: "İletişime geçtiğiniz için teşekkürler. Ekibimiz 24 saat içinde size dönecek.",
    },
    services: ["YZ Web Tasarımı", "YZ Otomasyonu", "YZ İş Akışları", "YZ Sistemleri", "YZ UGC İçeriği", "YZ Pazarlama", "YZ İçerik Üretimi", "YZ Markalaşma", "YZ Satış Sistemleri", "YZ Video Prodüksiyonu", "YZ İş Altyapısı", "YZ Danışmanlığı"],
  },
  footer: {
    tagline: "Tamamen YZ destekli iş sistemleri inşa eden premium yapay zekâ ajansı. Zekâ. Hassasiyet. Zanaat.",
    columns: [
      {
        title: "Hizmetler",
        links: ["YZ Web Tasarımı", "YZ Otomasyonu", "YZ İş Akışları", "YZ İçerik Üretimi", "Özel YZ Çözümleri"],
      },
      {
        title: "Platform",
        links: ["Genel Bakış", "Özellikler", "Fiyatlandırma", "Entegrasyonlar", "API"],
      },
      {
        title: "Şirket",
        links: ["Hakkımızda", "Kariyer", "Blog", "Haberler", "İletişim"],
      },
    ],
    rights: "© 2026 Treetiti. Tüm hakları saklıdır.",
    legal: ["Gizlilik", "Kullanım Şartları", "Çerezler"],
  },
  chat: {
    welcome: "Treetiti'ye hoş geldiniz. Size nasıl yardımcı olabilirim?",
    quickActions: ["Projeleri Gör", "Fiyat Alın", "Randevu Alın", "Yatırım Bilgisi"],
    placeholder: "Mesajınızı yazın...",
  },
  chatWidget: {
    openChat: "Sohbeti aç",
    treetitiConcierge: "Treetiti Danışmanı",
    online: "Çevrimiçi",
    maximize: "Büyüt",
    minimize: "Küçült",
    closeChat: "Sohbeti kapat",
    welcomeToTreetiti: "Treetiti'ye Hoş Geldiniz",
    shareDetails: "Sohbete başlamak için bilgilerinizi paylaşın.",
    name: "Ad",
    namePlaceholder: "Adınız",
    email: "E-posta",
    emailPlaceholder: "email@adresiniz.com",
    startConversation: "Sohbete Başla",
    chatInput: "Sohbet mesajı girişi",
    sendMessage: "Mesajı gönder",
  },
  chatProvider: {
    successReply: "Mesajınız için teşekkürler. Satış danışmanımız talebinizi inceledikten sonra kısa süre içinde size dönüş yapacaktır.",
    fallbackReply: "Yaşanan aksaklık için özür dileriz. Bir satış danışmanı kısa süre içinde sizinle iletişime geçecektir.",
    delayReply: "Gecikme için özür dileriz. Bir satış danışmanı en kısa sürede sizinle olacak.",
  },
  whatsapp: {
    message: "Merhaba! Hizmetleriniz hakkında daha fazla bilgi almak istiyorum.",
    contactUs: "WhatsApp'tan bize yazın",
  },
  themeSwitch: {
    switchToDark: "Karanlık moda geç",
    switchToLight: "Aydınlık moda geç",
  },
  auth: {
    welcomeBack: "Tekrar Hoş Geldiniz",
    signInToContinue: "Devam etmek için hesabınıza giriş yapın.",
    email: "E-posta",
    password: "Şifre",
    rememberMe: "Beni hatırla",
    forgotPassword: "Şifremi unuttum",
    continue: "Giriş Yap",
    orContinueWith: "veya şununla devam et",
    dontHaveAccount: "Hesabınız yok mu?",
    getStarted: "Başlayın",
    close: "Kapat",
    googleSoon: "Çok Yakında",
    gitHubSoon: "Çok Yakında",
    signIn: "Giriş Yap",
    startProject: "Proje Başlat",
    validationError: "Lütfen e-posta adresinizi ve şifrenizi girin.",
    googleLabel: "Google",
    gitHubLabel: "GitHub",
  },
  startPage: {
    entryTitle: "Ne inşa etmemizi istersiniz?",
    premiumPackage: "Hazır Paket",
    premiumPackageDesc: "Tam olarak ne istediğinizi biliyorsanız ideal.",
    customSolution: "Özel YZ Çözümü",
    customSolutionDesc: "Birlikte keşfedelim.",
    back: "Geri",
    exit: "Çıkış",
    choosePackage: "Paketinizi Seçin",
    choosePackageDesc: "Her paket belirli bir ölçek için tasarlanmıştır. Hepsi imza kalitemizi içerir.",
    popular: "Popüler",
    starting: "başlayan",
    selectPackage: "Paketi Seç",
    backToPackages: "Paketlere Dön",
    projectName: "Proje Adı",
    projectNamePlaceholder: "Proje adınız",
    businessEmail: "İş E-postası",
    businessEmailPlaceholder: "siz@sirketiniz.com",
    notesOptional: "Notlar (isteğe bağlı)",
    notesPlaceholder: "Özel gereksinimler...",
    uploadFiles: "Dosya Yükle (isteğe bağlı)",
    dropFilesHere: "Dosyaları buraya bırakın",
    remove: "Kaldır",
    reviewYourProject: "Projenizi İnceleyin",
    everythingLooksGood: "Her şey doğru mu? Gönderin.",
    projectType: "Proje Türü",
    industry: "Sektör",
    timeline: "Zaman Çizelgesi",
    budget: "Bütçe",
    company: "Şirket",
    email: "E-posta",
    notes: "Notlar",
    services: "Hizmetler",
    edit: "Düzenle",
    submitting: "Gönderiliyor...",
    submitProject: "Projeyi Gönder",
    thankYou: "Teşekkür ederiz.",
    wellReview: "Projenizi inceleyip 24 saat içinde size döneceğiz.",
    reference: "Referans:",
    returnHome: "Ana Sayfaya Dön",
    customQuestions: {
      type: "Ne inşa etmeyi düşünüyorsunuz?",
      industry: "Hangi sektördesiniz?",
      goal: "Birincil hedefiniz nedir?",
      branding: "Mevcut bir markanız var mı?",
      deadline: "Aklınızda bir teslim tarihi var mı?",
    },
    customPlaceholders: {
      type: "Projenizden bahsedin...",
      industry: "Örn: Gayrimenkul, Sağlık, Teknoloji...",
      goal: "Satışları artırmak, iş akışlarını otomatize etmek, marka inşa etmek...",
      branding: "Evet, tam marka / Kısmen / Sıfırdan başlıyoruz",
      deadline: "Acil, 1 ay, 3 ay, esnek...",
    },
    thanksSummary: "Teşekkürler. Proje özetiniz:",
    projectSummary: "Proje Özeti",
    awaitingResponse: "Yanıt bekleniyor...",
    typeYourMessage: "Mesajınızı yazın...",
    packages: [
      {
        name: "Başlangıç",
        tagline: "YZ Destekli Temel",
        features: ["YZ Web Tasarımı", "Temel Otomasyon", "İçerik Stratejisi", "Analitik Kurulumu"],
        price: "$2,000",
        timeline: "2 Hafta",
        desc: "Temel YZ varlığı",
      },
      {
        name: "UGC Pazarlama",
        tagline: "Özgün YZ Üretimi İçerik",
        features: ["YZ Video Prodüksiyonu", "İçerik Takvimi", "Sosyal Medya Varlıkları", "Marka Sesi YZ"],
        price: "$3,500",
        timeline: "2-3 Hafta",
        desc: "Ölçekte içerik",
      },
      {
        name: "Profesyonel",
        tagline: "Tam YZ Dönüşümü",
        features: ["Tam YZ Web Sitesi", "Otomasyon Paketi", "YZ İçerik Hattı", "CRM Entegrasyonu", "Analitik Paneli"],
        price: "$7,500",
        timeline: "4 Hafta",
        desc: "Uçtan uca YZ sistemi",
      },
      {
        name: "YZ Mimarisi",
        tagline: "Özel Sistem Tasarımı",
        features: ["Özel YZ Altyapısı", "Çoklu Ajan İş Akışları", "API Entegrasyonu", "Vektör Veritabanları", "MCP Sunucuları"],
        price: "$12,000",
        timeline: "6-8 Hafta",
        desc: "Kurumsal mimari",
      },
      {
        name: "Kurumsal",
        tagline: "Özel YZ Ekosistemi",
        features: ["Tam YZ Dönüşümü", "Özel Ekip", "Özel Model Eğitimi", "Altyapı Kurulumu", "7/24 Destek", "SLA Garantisi"],
        price: "$25,000+",
        timeline: "3-6 Ay",
        desc: "Kurumsal düzey çözüm",
      },
    ],
    whatToBuild: "Ne inşa etmemizi istersiniz?",
    whatAreYouBuilding: "Ne inşa etmek istiyorsunuz?",
    whatIndustry: "Hangi sektördesiniz?",
    primaryGoal: "Birincil hedefiniz nedir?",
    doYouHaveBranding: "Markanız var mı?",
    deadline: "Bir teslim tarihiniz var mı?",
    placeholder: {
      whatAreYouBuilding: "Projenizden bahsedin...",
      whatIndustry: "Örn: Gayrimenkul, Sağlık, Teknoloji...",
      primaryGoal: "Satışları artırmak, iş akışlarını otomatize etmek, marka inşa etmek...",
      doYouHaveBranding: "Evet, tam markamız var / Kısmen / Sıfırdan başlıyoruz",
      deadline: "Acil, 1 ay, 3 ay, esnek...",
    },
  },
  language: {
    switch: "Dil Değiştir",
    en: "English",
    fa: "فارسی",
    ru: "Русский",
    ar: "العربية",
    tr: "Türkçe",
    es: "Español",
  },
  terms: {
    title: "Kullanım Koşulları",
    lastUpdated: "Son güncelleme: Ocak 2026",
    sections: [
      {
        title: "1. Koşulların Kabulü",
        body: "Treetiti web sitesine ve hizmetlerine erişerek veya bunları kullanarak bu Kullanım Koşulları'nı kabul etmiş olursunuz. Kabul etmiyorsanız hizmetlerimizi kullanmayın.",
      },
      {
        title: "2. Hizmet Tanımı",
        body: "Treetiti, web sitesi tasarımı, otomasyon sistemleri, YZ ajanları, içerik üretimi ve danışmanlık hizmetleri dahil olmak üzere YZ destekli dijital çözümler sunar. Her hizmet sözleşmesine ilişkin özel koşullar ayrı bir İş Tanımı belgesinde belirtilecektir.",
      },
      {
        title: "3. Fikri Mülkiyet",
        body: "Önceden var olan materyallerimiz, araçlarımız ve çerçevelerimizdeki tüm fikri mülkiyet hakları bize aittir. Projeniz için özel olarak oluşturulan teslimatlar, tam ödeme sonrasında sizin mülkiyetinize geçer.",
      },
      {
        title: "4. Gizlilik",
        body: "Her iki taraf, sözleşme süresince paylaşılan tüm özel bilgilerin gizliliğini korumayı kabul eder. Bu yükümlülük, sözleşmenin sona ermesinden sonra da geçerliliğini korur.",
      },
      {
        title: "5. Sorumluluk Sınırlaması",
        body: "Sorumluluğumuz, talebe konu olan belirli hizmet için ödenen tutarla sınırlıdır. Dolaylı, arızi veya sonuçsal zararlardan sorumlu değiliz.",
      },
      {
        title: "6. Geçerli Kanun",
        body: "Bu koşullar Birleşik Arap Emirlikleri kanunlarına tabidir. Herhangi bir uyuşmazlık Dubai'de tahkim yoluyla çözülecektir.",
      },
    ],
  },
  privacy: {
    title: "Gizlilik Politikası",
    lastUpdated: "Son güncelleme: Ocak 2026",
    sections: [
      {
        title: "1. Topladığımız Bilgiler",
        body: "İletişim formumuzu doldurduğunuzda veya sohbet aracımızı kullandığınızda bize doğrudan sağladığınız ad, e-posta adresi, telefon numarası ve şirket adı gibi bilgileri topluyoruz. Ayrıca cihazınız ve gezinme davranışınız hakkında belirli teknik bilgileri otomatik olarak topluyoruz.",
      },
      {
        title: "2. Bilgilerinizi Kullanma Şeklimiz",
        body: "Topladığımız bilgileri taleplerinize yanıt vermek, hizmetlerimizi sunmak, web sitemizi iyileştirmek, hizmetlerimiz hakkında ilgili bildirimler göndermek ve yasal yükümlülüklere uymak için kullanıyoruz.",
      },
      {
        title: "3. Veri Paylaşımı",
        body: "Kişisel bilgilerinizi satmıyoruz. Web sitemizin ve işletmemizin işletilmesine yardımcı olan güvenilir hizmet sağlayıcılarla, gizlilik anlaşmalarına tabi olarak veri paylaşabiliriz.",
      },
      {
        title: "4. Veri Güvenliği",
        body: "Kişisel bilgilerinizi korumak için şifreleme, erişim kontrolleri ve düzenli güvenlik denetimleri dahil olmak üzere sektör standartlarında güvenlik önlemleri uyguluyoruz.",
      },
      {
        title: "5. Haklarınız",
        body: "Kişisel verilerinize erişme, düzeltme veya silme hakkına sahipsiniz. Ayrıca hellotreetiti@gmail.com adresinden bize ulaşarak istediğiniz zaman pazarlama iletişimlerinden çıkabilirsiniz.",
      },
      {
        title: "6. İletişim",
        body: "Bu gizlilik politikası hakkında sorularınız için hellotreetiti@gmail.com adresinden veya iletişim formumuz aracılığıyla bizimle iletişime geçin.",
      },
    ],
  },
  cookies: {
    title: "Çerez Politikası",
    lastUpdated: "Son güncelleme: Ocak 2026",
    sections: [
      {
        title: "1. Çerez Nedir",
        body: "Çerezler, bir web sitesini ziyaret ettiğinizde cihazınızda depolanan küçük metin dosyalarıdır. Tercihlerinizi hatırlayarak ve sitemizle nasıl etkileşim kurduğunuzu anlayarak daha iyi bir gezinme deneyimi sunmamıza yardımcı olurlar.",
      },
      {
        title: "2. Kullandığımız Çerez Türleri",
        subSections: [
          { title: "Zorunlu Çerezler:", body: "Gezinme ve güvenlik dahil temel web sitesi işlevselliği için gereklidir. Devre dışı bırakılamazlar." },
          { title: "Analitik Çerezleri:", body: "Ziyaretçilerin sitemizi nasıl kullandığını anlamamıza yardımcı olarak performans ve kullanıcı deneyimini iyileştirmemizi sağlar." },
          { title: "Tercih Çerezleri:", body: "Kişiselleştirilmiş bir deneyim için dil ve görüntüleme tercihlerinizi hatırlar." },
        ],
      },
      {
        title: "3. Üçüncü Taraf Çerezleri",
        body: "Kendi çerezlerini yerleştiren üçüncü taraf hizmetleri (arka uç hizmetleri için Supabase gibi) kullanabiliriz. Bu hizmetler kendi gizlilik politikalarına tabidir.",
      },
      {
        title: "4. Çerez Yönetimi",
        body: "Çerezleri tarayıcı ayarlarınızdan kontrol edebilir ve devre dışı bırakabilirsiniz. Bazı çerezleri devre dışı bırakmanın web sitesi işlevselliğini etkileyebileceğini unutmayın. Çoğu tarayıcı, çerez tercihlerini yönetmek için Ayarlar veya Tercihler menüsünde seçenekler sunar.",
      },
      {
        title: "5. Güncellemeler",
        body: "Bu Çerez Politikası'nı periyodik olarak güncelleyebiliriz. Değişiklikler, güncellenmiş bir revizyon tarihi ile bu sayfada yayınlanacaktır.",
      },
      {
        title: "6. İletişim",
        body: "Çerez kullanımımız hakkında sorularınız için hellotreetiti@gmail.com adresinden bizimle iletişime geçin.",
      },
    ],
  },
  admin: {
    layout: {
      dashboard: "Kontrol Paneli",
      inbox: "Gelen Kutusu",
      leads: "Potansiyel Müşteriler",
      clients: "Müşteriler",
      projects: "Projeler",
      invoices: "Faturalar",
      contracts: "Sözleşmeler",
      meetings: "Toplantılar",
      partners: "Ortaklar",
      settings: "Ayarlar",
      signOut: "Çıkış Yap",
      treetiti: "Treetiti",
    },
    login: {
      title: "Treetiti Yönetim",
      subtitle: "Hesabınıza giriş yapın",
      email: "E-posta",
      password: "Şifre",
      signingIn: "Giriş yapılıyor...",
      signIn: "Giriş Yap",
    },
    dashboard: {
      title: "Kontrol Paneli",
      totalLeads: "Toplam Potansiyel Müşteri",
      clients: "Müşteriler",
      activeProjects: "Aktif Projeler",
      unreadMessages: "Okunmamış Mesajlar",
    },
    inbox: {
      title: "Gelen Kutusu",
      new: "Yeni",
      replied: "Yanıtlandı",
      you: "Siz",
      replyPlaceholder: "Yanıtınızı yazın...",
      selectMessage: "Yanıtlamak için bir mesaj seçin",
      senderName: "Treetiti",
      senderEmail: "hellotreetiti@gmail.com",
    },
    leads: {
      title: "Potansiyel Müşteriler",
      all: "Tümü",
      name: "Ad",
      email: "E-posta",
      source: "Kaynak",
      stage: "Aşama",
      date: "Tarih",
    },
    clients: {
      title: "Müşteriler",
      company: "Şirket",
      status: "Durum",
      revenue: "Gelir",
      since: "Başlangıç",
    },
    projects: {
      title: "Projeler",
      name: "Ad",
      level: "Seviye",
      status: "Durum",
      value: "Değer",
      created: "Oluşturulma",
    },
    invoices: {
      title: "Faturalar",
      invoice: "Fatura",
      amount: "Tutar",
      deposit: "Ön Ödeme",
      status: "Durum",
      due: "Vade",
    },
    contracts: {
      title: "Sözleşmeler",
      titleField: "Başlık",
      value: "Değer",
      signed: "İmzalandı",
      created: "Oluşturulma",
    },
    meetings: {
      title: "Toplantılar",
      type: "Tür",
      scheduled: "Planlanan",
      status: "Durum",
      notes: "Notlar",
    },
    partners: {
      title: "Ortaklar",
      name: "Ad",
      email: "E-posta",
      permission: "Yetki",
      notes: "Notlar",
    },
    settings: {
      title: "Ayarlar",
      account: "Hesap",
      email: "E-posta",
      userId: "Kullanıcı ID",
    },
  },
  serviceDetails: [
    {
      title: "YZ Web Tasarımı",
      desc: "Düşünen, uyum sağlayan ve dönüştüren yeni nesil web siteleri.",
      overview: "Statik sayfaların ötesine geçen, YZ destekli web siteleri tasarlıyor ve geliştiriyoruz. Her öğe, etkileşimi ve dönüşümü en üst düzeye çıkaran kişiselleştirilmiş deneyimler sunmak için makine öğrenimi ile optimize edilir.",
      benefits: [
        "Ziyaretçi başına gerçek zamanlı kişiselleştirme yapan uyarlanabilir arayüz",
        "Otomatik kazanan belirleme ile YZ destekli A/B testi",
        "Algoritma değişikliklerine uyum sağlayan yerleşik SEO optimizasyonu",
        "Analitik odaklı otomatik içerik güncellemeleri"
      ],
      workflow: [
        { step: "Keşif", desc: "Markanızın, kitlenizin ve iş hedeflerinizin YZ stratejisini tanımlamak için derinlemesine analizi" },
        { step: "Mimari", desc: "YZ destekli bileşen ağacı, veri akışı ve kişiselleştirme kurallarının tasarımı" },
        { step: "Geliştirme", desc: "React, Next.js, Tailwind ile her katmanda YZ ajanları entegre ederek geliştirme" },
        { step: "Eğitim", desc: "YZ modellerinin içeriğiniz, marka sesiniz ve kullanıcı davranışı verilerinizle eğitilmesi" },
        { step: "Yayın", desc: "Gerçek kullanıcı etkileşimlerinden sürekli öğrenen, kesintisiz dağıtım" }
      ],
      technologies: ["React", "Next.js", "Tailwind CSS", "Framer Motion", "Supabase", "LangGraph", "Vercel AI SDK"],
      faq: [
        { q: "YZ web sitesi ne kadar sürede tamamlanır?", a: "Karmaşıklığa ve YZ özelliklerinin kapsamına bağlı olarak genellikle 6-12 hafta." },
        { q: "İçeriği kendim güncelleyebilir miyim?", a: "Evet, YZ'nin içerik oluşturma ve optimizasyonda size yardımcı olduğu tam bir CMS sunuyoruz." },
        { q: "Eğitim verisi sağlamam gerekiyor mu?", a: "Sahip olduğunuz her türlü veriyle çalışıyoruz. Sürecimiz mevcut analitiklerinizden içgörüler çıkarır." }
      ],
      relatedIds: ["ai-automation", "ai-systems", "ai-content-creation"]
    },
    {
      title: "YZ Otomasyonu",
      desc: "Kuruluşunuzdaki tekrarlayan işleri tamamen ortadan kaldırın.",
      overview: "İş akışlarını, veri işlemeyi ve karmaşık karar alma süreçlerini makine hızında yürüten, ekibinizi yüksek değerli işlere odaklayan özel YZ otomasyon çözümleri.",
      benefits: [
        "Manuel işlem süresinde %70-90 azalma",
        "Sıfır hata ile veri işleme ve karar yürütme",
        "Küçük ekiplerden kurumsal operasyonlara ölçeklenebilirlik",
        "Mevcut araçlar ve API'lerle sorunsuz entegrasyon"
      ],
      workflow: [
        { step: "Denetim", desc: "Mevcut manuel süreçlerinizin ve darboğazlarınızın kapsamlı analizi" },
        { step: "Tasarım", desc: "n8n, LangGraph ve özel YZ ajanları ile otomasyon iş akışlarının tasarlanması" },
        { step: "Geliştirme", desc: "Her otomasyon düğümünün uç durumlar dahil geliştirilmesi ve test edilmesi" },
        { step: "Dağıtım", desc: "İzleme panoları ve hata kurtarma sistemleriyle yayına alma" }
      ],
      technologies: ["n8n", "LangGraph", "Python", "Supabase", "OpenAI API", "n8n MCP", "Özel Ajanlar"],
      faq: [
        { q: "Hangi süreçler otomatize edilebilir?", a: "Neredeyse tüm tekrarlayan dijital süreçler — veri girişi, raporlama, müşteri takibi, içerik yayını, fatura işleme, müşteri desteği." },
        { q: "Otomasyon kurulumu ne kadar sürer?", a: "Basit otomasyonlar günler içinde, kurumsal iş akışları 2-4 hafta içinde hazır." }
      ],
      relatedIds: ["ai-workflows", "ai-sales-systems", "ai-business-infrastructure"]
    },
    {
      title: "YZ İş Akışları",
      desc: "Tüm işletmenizi akıllı iş akışı sistemleriyle yönetin.",
      overview: "İnsan gözetimi olmadan karmaşık iş süreçlerini yürüten, YZ ajanlarını, API'leri ve insan devir teslimlerini sorunsuzca koordine eden çok adımlı, çok ajanlı hatlar.",
      benefits: [
        "Departmanlar arası uçtan uca süreç orkestrasyonu",
        "YZ ve insan ajanları arasında akıllı yönlendirme ve eskalasyon",
        "Gerçek zamanlı izleme ve kendi kendini iyileştiren iş akışları",
        "Denetime hazır kayıt ve uyumluluk dokümantasyonu"
      ],
      workflow: [
        { step: "Haritalama", desc: "Mevcut sürecinizdeki her adımı, karar noktasını ve devir teslimi belgelemek" },
        { step: "Ajan Tasarımı", desc: "Her iş akışı aşaması için özel YZ ajanları tasarlamak" },
        { step: "Entegrasyon", desc: "Tüm araçları, veritabanlarını ve iletişim kanallarını birbirine bağlamak" },
        { step: "Test", desc: "Doğruluğu onaylamak için binlerce simüle senaryo çalıştırmak" }
      ],
      technologies: ["LangGraph", "CrewAI", "n8n", "Supabase", "Redis", "Docker", "Özel MCP Sunucuları"],
      faq: [
        { q: "Bir iş akışı kaç adım işleyebilir?", a: "Sınırsız. 10'dan fazla sistemde 50+ adımlı iş akışları geliştirdik." },
        { q: "Bir adım başarısız olursa ne olur?", a: "Yerleşik hata yönetimi ile yeniden deneme mantığı, yedek yollar ve insan eskalasyonu." }
      ],
      relatedIds: ["ai-automation", "ai-systems", "ai-business-infrastructure"]
    },
    {
      title: "YZ Sistemleri",
      desc: "YZ çağı için akıllı sistem mimarisi.",
      overview: "Öğrenen, uyum sağlayan ve sorunsuz ölçeklenen özel altyapı. Veri hatlarından dağıtıma, izleme ve sürekli iyileştirmeye kadar tam yığın YZ sistemleri.",
      benefits: [
        "Kurumsal düzeyde güvenlik ve uyumluluk",
        "İhtiyaçlarınızla birlikte büyüyen otomatik ölçeklenen altyapı",
        "Her sistem için gerçek zamanlı analitik panoları",
        "Üretim verilerinden sürekli model iyileştirme"
      ],
      workflow: [
        { step: "Gereksinimler", desc: "Sistem sınırlarını, veri kaynaklarını ve performans hedeflerini tanımlama" },
        { step: "Mimari", desc: "Yedeklilik ve hata devretme ile tam sistem yığınını tasarlama" },
        { step: "Uygulama", desc: "Tüm bileşenleri CI/CD hatları ile geliştirme ve entegre etme" },
        { step: "İzleme", desc: "Tam gözlemlenebilirlik, uyarılar ve otomatik yanıtlarla dağıtım" }
      ],
      technologies: ["Supabase", "Python", "TypeScript", "Docker", "PostgreSQL", "Redis", "Vercel", "AWS"],
      faq: [
        { q: "Sistem güvenilirliğini nasıl sağlıyorsunuz?", a: "Yedekli mimariler, otomatik hata devretme, 7/24 izleme ve aylık dayanıklılık testleri." }
      ],
      relatedIds: ["ai-business-infrastructure", "ai-workflows", "ai-automation"]
    },
    {
      title: "YZ UGC",
      desc: "Özgün kullanıcı içeriği üreten gerçekçi YZ yaratıcıları.",
      overview: "İnsan gibi hissettiren sanal fenomenler, ürün referansları ve marka hikâyeleri. Tam yaratıcı kontrol ve marka uyumu ile ölçekte YZ üretimi UGC.",
      benefits: [
        "Tutarlı marka kalitesinde sınırsız içerik hacmi",
        "Sıfır prodüksiyon maliyeti veya yetenek programlaması",
        "Tüm üretilen varlıkların ve benzerliklerin tam mülkiyeti",
        "Tek hat ile çok dilli, çok kültürlü içerik"
      ],
      workflow: [
        { step: "Karakter Tasarımı", desc: "Marka kimliğinizle uyumlu YZ kişilikleri tasarlama" },
        { step: "Ses Eğitimi", desc: "Doğal konuşma sentezi için özel ses modelleri eğitme" },
        { step: "Sahne Üretimi", desc: "Arka planlar, ortamlar ve ürün etkileşimleri oluşturma" },
        { step: "Prodüksiyon", desc: "Otomatik kalite kontrol ile toplu içerik üretimi" }
      ],
      technologies: ["ComfyUI", "Stable Diffusion", "Hedra", "ElevenLabs", "Kling", "Runway", "Özel Hatlar"],
      faq: [
        { q: "İzleyiciler YZ üretimi olduğunu anlayabilir mi?", a: "Ultra gerçekçi hattımız, gerçek çekimlerden ayırt edilemeyen içerik üretir. FTC yönergelerine uygun şeffaf beyan öneriyoruz." },
        { q: "Ne kadar hızlı içerik üretebilirsiniz?", a: "Prodüksiyon hattımızla haftada 50'ye kadar benzersiz video parçası." }
      ],
      relatedIds: ["ai-video-production", "ai-content-creation"]
    },
    {
      title: "YZ Pazarlama",
      desc: "Analiz eden, tahmin eden ve harekete geçen tam kanal YZ pazarlaması.",
      overview: "Her kanalda ve her kitle segmentinde kendini gerçek zamanlı optimize eden kampanyalar. İlk günden ölçülebilir YG artışı sağlayan YZ odaklı pazarlama.",
      benefits: [
        "Tüm kanallarda gerçek zamanlı kampanya optimizasyonu",
        "Benzer kitle modellemesi ile tahmine dayalı hedefleme",
        "Kazanan belirleme ile otomatik yaratıcı testi",
        "Tam ilişkilendirme modellemesi ve YG analitiği"
      ],
      workflow: [
        { step: "Denetim", desc: "Mevcut pazarlama performansını, kanalları ve kitle verilerini analiz etme" },
        { step: "Strateji", desc: "Tahmine dayalı modellerle YZ optimize kampanya yapısı tasarlama" },
        { step: "Yayın", desc: "YZ'nin bütçe ve yaratıcı rotasyonu yönettiği kampanyaları başlatma" },
        { step: "Optimizasyon", desc: "Performans verilerine dayalı sürekli YZ odaklı optimizasyon" }
      ],
      technologies: ["Python", "OpenAI API", "Google Ads API", "Meta API", "Supabase", "n8n", "Özel Analitik"],
      faq: [
        { q: "Hangi platformları destekliyorsunuz?", a: "Tüm büyük platformlar — Google, Meta, LinkedIn, TikTok, ayrıca programatik ve CTV." },
        { q: "Ne kadar YG bekleyebilirim?", a: "Müşterilerimiz 90 gün içinde tipik olarak 3-10x YG artışı görüyor." }
      ],
      relatedIds: ["ai-content-creation", "ai-sales-systems", "ai-ugc"]
    },
    {
      title: "YZ İçerik Üretimi",
      desc: "Ölçekte premium, marka uyumlu içerik üretimi.",
      overview: "Liderlik makalelerinden sosyal medya kampanyalarına, YZ'miz etkileşim yaratan, otorite inşa eden ve okuyucuları müşteriye dönüştüren içerikler üretir.",
      benefits: [
        "Tüm içerik türlerinde tutarlı marka sesi",
        "Tek kaynaktan çok dilli içerik",
        "YZ anahtar kelime hedefleme ile SEO optimize yapı",
        "Otomatik içerik takvimi ve dağıtım"
      ],
      workflow: [
        { step: "Strateji", desc: "İçerik temelleri, kitle segmentleri ve kanal stratejisini tanımlama" },
        { step: "Eğitim", desc: "YZ'yi marka sesiniz, yönergeleriniz ve mevcut içeriğinizle eğitme" },
        { step: "Üretim", desc: "İnsan denetimi ile içerik oluşturma, inceleme ve iyileştirme" },
        { step: "Dağıtım", desc: "Tüm platformlarda planlı otomatik yayın" }
      ],
      technologies: ["OpenAI API", "Claude API", "LangChain", "Supabase", "n8n", "Özel RAG Hattı"],
      faq: [
        { q: "İçerik YZ gibi mi duyulacak?", a: "Hayır. Hattımız, marka sesinizle eğitilmiş özel ince ayarlı modeller kullanır." },
        { q: "İçerik özgün mü?", a: "Her parça benzersiz şekilde üretilir ve özgünlük açısından kontrol edilir." }
      ],
      relatedIds: ["ai-marketing", "ai-ugc", "ai-video-production"]
    },
    {
      title: "YZ Markalaşma",
      desc: "Pazarınızla evrilen akıllı markalaşma.",
      overview: "Pazarınız ve kitleniz geliştikçe uyum sağlayan YZ destekli kimlik sistemleri, dinamik logo üretimi ve veri odaklı marka stratejisi.",
      benefits: [
        "Pazar araştırması destekli veri odaklı marka kimliği",
        "Bağlamlara göre uyum sağlayan dinamik marka sistemleri",
        "YZ üretimi marka konseptleriyle hızlı iterasyon",
        "Tüm temas noktalarında tutarlı marka uygulaması"
      ],
      workflow: [
        { step: "Araştırma", desc: "Pazar analizi, rakip denetimi, kitle araştırması" },
        { step: "Strateji", desc: "YZ destekli marka konumlandırma ve kimlik yönü belirleme" },
        { step: "Tasarım", desc: "YZ araçlarıyla marka öğelerini oluşturma ve iyileştirme" },
        { step: "Sistematize Etme", desc: "Kapsamlı marka yönergeleri ve YZ araç setleri oluşturma" }
      ],
      technologies: ["Midjourney", "DALL-E", "Stable Diffusion", "GPT-4V", "Özel Stil Modelleri"],
      faq: [
        { q: "Mevcut marka yönergelerine uyum sağlayabilir misiniz?", a: "Evet, mevcut materyallerinizi analiz eder ve bunları genişleten YZ araçları geliştiririz." }
      ],
      relatedIds: ["ai-content-creation", "ai-website-design", "ai-marketing"]
    },
    {
      title: "YZ Satış Sistemleri",
      desc: "7/24 potansiyel müşteri bulan, besleyen ve kapatan YZ satış ajanları.",
      overview: "İnsan düzeyinde ikna ve veri odaklı takip ile kesintisiz satış hattı. Asla uyumayan, asla müşteri kaçırmayan ve sürekli öğrenip gelişen YZ satış ajanları.",
      benefits: [
        "İnsan müdahalesi olmadan 7/24 müşteri adayı kalifikasyonu ve besleme",
        "Doğal diyalog ile ölçekte kişiselleştirilmiş erişim",
        "Etkileşim sinyallerine dayalı akıllı takip zamanlaması",
        "Aktivite takibi ile tam CRM entegrasyonu"
      ],
      workflow: [
        { step: "Entegrasyon", desc: "CRM'inize, web sitenize ve iletişim kanallarınıza bağlanma" },
        { step: "Eğitim", desc: "YZ'yi satış oyun kitabınız, senaryolarınız ve geçmiş verilerinizle eğitme" },
        { step: "Dağıtım", desc: "Eskalasyon kuralları ile çok kanallı YZ satış ajanlarını başlatma" },
        { step: "Optimizasyon", desc: "Senaryoların, zamanlamanın ve kanalların sürekli A/B testi" }
      ],
      technologies: ["LangGraph", "CrewAI", "Supabase", "Twilio", "WhatsApp API", "Telegram API", "Özel CRM"],
      faq: [
        { q: "Konuşmalar ne kadar doğal?", a: "Çoklu model mimarisi, müşteri adaylarının insan satış temsilcilerinden ayırt edemeyeceği bağlam bilincinde, doğal diyalog sağlar." },
        { q: "Müşteri adayı insanla görüşmek isterse?", a: "Tam konuşma bağlamı korunarak ekibinize sorunsuz devir teslim." }
      ],
      relatedIds: ["ai-automation", "ai-marketing", "ai-workflows"]
    },

    {
      title: "YZ Video Prodüksiyonu",
      desc: "Uçtan uca YZ video prodüksiyon hattı.",
      overview: "Konsept geliştirme ve senaryodan son kurguya, YZ yaratıcı sürecin her karesini hızlandırarak eşi benzeri görülmemiş hızda yayın kalitesinde video sunar.",
      benefits: [
        "Geleneksel iş akışlarından 10 kat daha hızlı prodüksiyon",
        "Tüm video içeriklerinde tutarlı kalite",
        "Otomatik rotoskop, renk düzeltme ve ses tasarımı",
        "YZ destekli revizyon döngüleriyle kolay iterasyon"
      ],
      workflow: [
        { step: "Ön Prodüksiyon", desc: "YZ destekli konsept geliştirme, storyboard ve planlama" },
        { step: "Prodüksiyon", desc: "Gerçek zamanlı kompozisyon rehberliği ile YZ geliştirilmiş çekim" },
        { step: "Post-Prodüksiyon", desc: "YZ destekli kurgu, efekt, renk düzeltme ve ses" },
        { step: "Teslimat", desc: "Her platform için optimize edilmiş çok formatlı dışa aktarım" }
      ],
      technologies: ["Runway", "ComfyUI", "Topaz", "ElevenLabs", "DaVinci Resolve", "Özel YZ Hatları"],
      faq: [
        { q: "Hangi video formatlarında üretim yapıyorsunuz?", a: "60 saniyelik sosyal kliplerden 30 dakikalık marka filmlerine ve belgesellere kadar her şey." }
      ],
      relatedIds: ["ai-ugc", "ai-content-creation"]
    },
    {
      title: "YZ İş Altyapısı",
      desc: "YZ destekli organizasyonunuzun omurgası.",
      overview: "Akıllı operasyonlar, veri hatları ve model dağıtımı için tasarlanmış güvenli, ölçeklenebilir altyapı. Diğer tüm YZ yeteneklerini mümkün kılan temel.",
      benefits: [
        "SOC 2 uyumlu kurumsal düzeyde güvenlik",
        "YZ iş yükleri için otomatik ölçeklenen altyapı",
        "Merkezi veri hattı mimarisi",
        "Kapsamlı izleme ve gözlemlenebilirlik"
      ],
      workflow: [
        { step: "Değerlendirme", desc: "Mevcut altyapıyı, güvenlik duruşunu ve ölçek ihtiyaçlarını değerlendirme" },
        { step: "Tasarım", desc: "Yedeklilik ile bulut-yerel altyapı tasarlama" },
        { step: "Taşıma", desc: "Mevcut sistemlerin kesintisiz taşınması" },
        { step: "Optimizasyon", desc: "Sürekli performans ayarı ve maliyet optimizasyonu" }
      ],
      technologies: ["AWS", "Vercel", "Supabase", "Docker", "Kubernetes", "Terraform", "Cloudflare"],
      faq: [
        { q: "Mevcut altyapı ile çalışıyor musunuz?", a: "Evet, mevcut yığınınızla entegre olur ve onu geliştiririz. Söküp değiştirme gerekmez." }
      ],
      relatedIds: ["ai-systems", "ai-automation", "ai-workflows"]
    },
    {
      title: "YZ Danışmanlığı",
      desc: "Üst düzey yöneticiler için stratejik YZ danışmanlığı.",
      overview: "YZ'yi ölçekte teslim etmiş uygulayıcılardan yol haritaları, mimari kararları ve uygulama rehberliği. YZ'yi soyut potansiyelden somut iş avantajına dönüştürün.",
      benefits: [
        "İş hedefleriyle uyumlu üst düzey YZ stratejisi",
        "Satıcı bağımsız teknoloji önerileri",
        "Risk değerlendirmesi ve uyumluluk rehberliği",
        "Uygulama denetimi ve kalite güvencesi"
      ],
      workflow: [
        { step: "Keşif", desc: "İşletmenizin, hedeflerinizin ve mevcut yeteneklerinizin derinlemesine analizi" },
        { step: "Strateji", desc: "Önceliklendirilmiş girişimlerle kapsamlı YZ yol haritası" },
        { step: "Seçim", desc: "Teknoloji yığını değerlendirmesi ve satıcı seçimi" },
        { step: "Rehberlik", desc: "Uygulama boyunca ve sonrasında sürekli danışmanlık" }
      ],
      technologies: ["N/A — Teknoloji Bağımsız"],
      faq: [
        { q: "Danışmanlık, geliştirme hizmetlerinizden nasıl farklı?", a: "Danışmanlık strateji, planlama ve rehberliğe odaklanır. Uygulama ihtiyacınız varsa, geliştirme hizmetlerimiz gerçek sistemleri teslim eder." },
        { q: "Belirli satıcılar öneriyor musunuz?", a: "Satıcı bağımsızız. Öneriler tamamen ihtiyaçlarınıza, bütçenize ve kısıtlamalarınıza dayanır." }
      ],
      relatedIds: ["ai-systems", "ai-business-infrastructure", "ai-automation"]
    }
  ],
  portfolioDetails: [
    {
      title: "Akıllı Otomasyon Paketi",
      tag: "Kurumsal YZ",
      client: "Global Lojistik Şirketi",
      overview: "Çok uluslu bir lojistik şirketinin operasyonlarını dönüştüren, tedarik zinciri genelinde manuel işlemleri %85 azaltan kapsamlı bir YZ otomasyon platformu.",
      challenge: "Müşteri, 12 ülkede günlük 50.000'den fazla nakliye belgesi işliyor ve manuel veri girişi için 200'den fazla personel gerekiyordu. Hatalar yılda milyonlarca dolara mal oluyordu.",
      solution: "LangGraph ve özel bilgisayarlı görü modelleri kullanarak, tüm format ve dillerdeki nakliye belgelerini otomatik olarak çıkaran, doğrulayan ve işleyen çoklu ajanlı bir YZ sistemi geliştirdik.",
      results: [
        { metric: "İşlem Süresi", value: "-%85" },
        { metric: "Hata Oranı", value: "< %0.1" },
        { metric: "Yıllık Tasarruf", value: "$4.2M" },
        { metric: "YG", value: "%320" }
      ],
      technologies: ["LangGraph", "Bilgisayarlı Görü", "Supabase", "Python", "n8n", "Özel OCR Hattı"],
      timeline: "Başlangıçtan tam dağıtıma 14 hafta",
      images: [],
      relatedIds: ["cinematic-ai-interfaces", "autonomous-workflow-engine"]
    },
    {
      title: "Sinematik YZ Arayüzleri",
      tag: "Deneyim Tasarımı",
      client: "Lüks Gayrimenkul Geliştiricisi",
      overview: "YZ destekli emlak önerileri, gerçek zamanlı pazar analitiği ve yüksek net değerli alıcılar için kişiselleştirilmiş YZ danışmanı içeren sürükleyici bir 3D sinematik web sitesi.",
      challenge: "Müşteri, 5 uluslararası pazarda ölçekte kişiselleştirilmiş hizmetle, 50 milyon dolarlık mülklerinin lüksüne uygun bir dijital deneyime ihtiyaç duyuyordu.",
      solution: "React Three Fiber ile 3D hareketli web sitesi oluşturduk, LangGraph kullanarak YZ danışmanı entegre ettik ve Supabase Realtime ile gerçek zamanlı pazar analizi panosu geliştirdik.",
      results: [
        { metric: "Sitede Kalma Süresi", value: "+%240" },
        { metric: "Müşteri Dönüşümü", value: "+%180" },
        { metric: "Sayfa/Oturum", value: "12.4" },
        { metric: "Müşteri Memnuniyeti", value: "4.9/5" }
      ],
      technologies: ["React Three Fiber", "GSAP", "LangGraph", "Supabase", "Stripe", "Özel YZ Ajanları"],
      timeline: "3D varlık üretimi dahil 18 hafta",
      images: [],
      relatedIds: ["intelligent-automation-suite", "real-time-ai-analytics"]
    },
    {
      title: "Otonom İş Akışı Motoru",
      tag: "Altyapı",
      client: "FinTek Girişimi",
      overview: "8 bankacılık ortağı arasında B2B ödeme mutabakatlarını %99.99 doğrulukla ve sıfır insan müdahalesiyle işleyen tam otonom bir iş akışı motoru.",
      challenge: "Sınır ötesi B2B ödemelerinin manuel mutabakatı, parti başına 3 gün sürüyor ve %4 hata oranına sahipti. Girişimin, personel eklemeden 10 kat büyümesi gerekiyordu.",
      solution: "LangGraph ve CrewAI kullanarak, ödeme tespitinden istisna yönetimine kadar tüm mutabakat yaşam döngüsünü yöneten çoklu ajanlı bir iş akışı sistemi tasarladık.",
      results: [
        { metric: "İşlem Süresi", value: "45 dk" },
        { metric: "Doğruluk", value: "%99.99" },
        { metric: "Maliyet Azaltma", value: "-%92" },
        { metric: "Ölçek Kapasitesi", value: "Sınırsız" }
      ],
      technologies: ["LangGraph", "CrewAI", "n8n", "Supabase", "Python", "Redis", "Docker"],
      timeline: "MVP 12 hafta, tam platform 8 hafta",
      images: [],
      relatedIds: ["real-time-ai-analytics", "intelligent-automation-suite"]
    },
    {
      title: "Sinirsel İçerik Hattı",
      tag: "Medya ve İçerik",
      client: "Dijital Medya Ajansı",
      overview: "Tutarlı marka sesi ve otomatik dağıtımla, 8 dilde haftada 500'den fazla benzersiz içerik parçası üreten uçtan uca bir YZ içerik hattı.",
      challenge: "Ajansın, birden fazla müşteri ve dilde kalite ve marka tutarlılığını korurken içerik üretimini 20 kat artırması gerekiyordu.",
      solution: "Müşteri markası başına ince ayarlı dil modelleri, otomatik çeviri hatları ve YZ destekli dağıtım zamanlaması ile özel bir RAG tabanlı içerik motoru geliştirdik.",
      results: [
        { metric: "İçerik Çıktısı", value: "500+/hafta" },
        { metric: "Parça Başı Maliyet", value: "-%90" },
        { metric: "Dil", value: "8" },
        { metric: "Etkileşim", value: "+%65" }
      ],
      technologies: ["LangChain", "OpenAI API", "Claude API", "Supabase", "n8n", "Özel RAG", "Redis"],
      timeline: "İlk 10 hafta, sürekli optimizasyon",
      images: [],
      relatedIds: ["cinematic-ai-interfaces", "real-time-ai-analytics"]
    },
    {
      title: "Gerçek Zamanlı YZ Analitiği",
      tag: "Veri Zekâsı",
      client: "E-Ticaret Platformu",
      overview: "Yüksek hacimli bir e-ticaret operasyonu için tahmine dayalı envanter yönetimi, dinamik fiyatlandırma ve müşteri davranışı tahmini sağlayan gerçek zamanlı bir YZ analitik platformu.",
      challenge: "Müşteri, piyasa dinamiklerine ayak uyduramayan fiyatlandırma nedeniyle stok fazlası ve stok tükenmesi durumlarından yılda 2 milyon doların üzerinde kaybediyordu.",
      solution: "Supabase Realtime ve talep tahmini için özel ML modelleri kullanarak, otomatik fiyatlandırma ve envanter sistemleriyle entegre gerçek zamanlı bir analitik yığını kurduk.",
      results: [
        { metric: "Stok Tükenmesi Azaltma", value: "-%94" },
        { metric: "Gelir Artışı", value: "+%23" },
        { metric: "Tahmin Doğruluğu", value: "%96" },
        { metric: "YG", value: "%450" }
      ],
      technologies: ["Supabase", "Python ML", "Redis", "TypeScript", "D3.js", "Docker", "Özel Modeller"],
      timeline: "Başlangıçtan üretime 16 hafta",
      images: [],
      relatedIds: ["autonomous-workflow-engine", "neural-content-pipeline"]
    }
  ],
  architectureSection: {
    headers: ["Sinematik Görseller", "Etkileyici Projeler için"],
    quote: "\"Mimarlık, sanat ve mühendisliğin kesiştiği noktadır — vizyonun yapıyla buluştuğu ve her yüzeyin bir niyet hikâyesi anlattığı yerdir.\"",
    statValue: "50M+",
    statLabel: "metrekare render edildi",
    altCinematic: "Sinematik mimari görselleştirme",
    altInterior: "İç mimari",
    altExterior: "Dış cephe mimari render",
    stats: [
      { value: "200+", label: "Proje Görselleştirildi" },
      { value: "%98", label: "Müşteri Memnuniyeti" },
      { value: "12+", label: "Yıllık Deneyim" },
    ],
  },
  app: {
    skipToMain: "Ana içeriğe geç",
  },
};

export default tr;
