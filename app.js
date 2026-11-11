(() => {
  "use strict";

  const config = window.SHAFIQHub_CONFIG || {};
  const contactEmail = String(config.contactEmail || "").trim();

  // Optional public GitHub links. Only activate valid HTTPS GitHub URLs.
  const githubUrlFor = (key) => {
    let candidate = "";
    if (key === "organization") candidate = config.githubOrganizationUrl || "";
    else candidate = (config.teamGithubProfiles || {})[key] || "";
    try {
      const parsed = new URL(String(candidate).trim());
      if (parsed.protocol !== "https:" || !["github.com", "www.github.com"].includes(parsed.hostname)) return "";
      return parsed.href;
    } catch (_error) {
      return "";
    }
  };
  document.querySelectorAll("[data-github-config]").forEach((link) => {
    const url = githubUrlFor(link.dataset.githubConfig);
    if (url) {
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.hidden = false;
    } else {
      link.hidden = true;
    }
  });
  document.querySelectorAll("[data-github-pending]").forEach((note) => {
    note.hidden = Boolean(githubUrlFor(note.dataset.githubPending));
  });

  // Current year in the shared footer.
  const year = document.querySelector("[data-year]");
  if (year) year.textContent = String(new Date().getFullYear());

  // Responsive navigation.
  const menuButton = document.querySelector(".menu-toggle");
  const nav = document.querySelector(".primary-nav");
  if (menuButton && nav) {
    const closeMenu = () => {
      nav.classList.remove("open");
      menuButton.setAttribute("aria-expanded", "false");
      menuButton.setAttribute("aria-label", "Open navigation");
    };
    menuButton.addEventListener("click", () => {
      const isOpen = nav.classList.toggle("open");
      menuButton.setAttribute("aria-expanded", String(isOpen));
      menuButton.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
    });
    nav.addEventListener("click", (event) => {
      if (event.target.closest("a")) closeMenu();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeMenu();
    });
    document.addEventListener("click", (event) => {
      if (!nav.contains(event.target) && !menuButton.contains(event.target)) closeMenu();
    });
  }

  // Client-side blog search.
  const searchInput = document.querySelector("#blog-search");
  const blogGrid = document.querySelector("#blog-grid");
  const emptySearch = document.querySelector("#empty-search");
  if (searchInput && blogGrid) {
    const cards = Array.from(blogGrid.querySelectorAll(".blog-card"));
    searchInput.addEventListener("input", () => {
      const query = searchInput.value.trim().toLowerCase();
      let visibleCount = 0;
      cards.forEach((card) => {
        const haystack = `${card.dataset.search || ""} ${card.textContent}`.toLowerCase();
        const matches = haystack.includes(query);
        card.hidden = !matches;
        if (matches) visibleCount += 1;
      });
      if (emptySearch) emptySearch.hidden = visibleCount !== 0;
    });
  }

  // Contact page: static sites cannot deliver email server-side. Use mailto when
  // configured; otherwise prepare a message the visitor can copy into their mail app.
  const contactForm = document.querySelector("#contact-form");
  if (contactForm) {
    const hint = document.querySelector("#form-hint");
    const output = document.querySelector("#message-output");
    const preparedMessage = document.querySelector("#prepared-message");
    const copyButton = document.querySelector("#copy-message");
    const subjectSelect = contactForm.querySelector('[name="subject"]');
    const productField = contactForm.querySelector('[name="product"]');
    const params = new URLSearchParams(window.location.search);
    const requestedSubject = params.get("subject");
    const requestedProduct = params.get("product");

    if (requestedSubject && subjectSelect) {
      const option = Array.from(subjectSelect.options).find((item) =>
        item.value.toLowerCase() === requestedSubject.toLowerCase()
      );
      if (option) subjectSelect.value = option.value;
    }
    if (requestedProduct && productField) productField.value = requestedProduct;

    contactForm.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!contactForm.reportValidity()) return;

      const data = new FormData(contactForm);
      const name = String(data.get("name") || "").trim();
      const email = String(data.get("email") || "").trim();
      const subject = String(data.get("subject") || "General enquiry").trim();
      const product = String(data.get("product") || "").trim();
      const message = String(data.get("message") || "").trim();
      const body = [
        `Name: ${name}`,
        `Email: ${email}`,
        product ? `Related product: ${product}` : "",
        "",
        message
      ].filter((line) => line !== undefined).join("\n");

      if (contactEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
        const mailto = `mailto:${contactEmail}?subject=${encodeURIComponent(`[ShafiqHub] ${subject}`)}&body=${encodeURIComponent(body)}`;
        window.location.href = mailto;
        if (hint) hint.textContent = "Your email app should open with the message ready to send.";
      } else {
        if (preparedMessage) preparedMessage.value = `To: [add your contact email]\nSubject: [ShafiqHub] ${subject}\n\n${body}`;
        if (output) output.hidden = false;
        if (hint) hint.textContent = "Your message is ready. Copy it below and send it from your email app.";
        if (output) output.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    });

    if (copyButton && preparedMessage) {
      copyButton.addEventListener("click", async () => {
        preparedMessage.focus();
        preparedMessage.select();
        try {
          await navigator.clipboard.writeText(preparedMessage.value);
          copyButton.textContent = "Copied";
        } catch (_error) {
          // Selection remains active as a fallback for browsers without clipboard access.
          copyButton.textContent = "Select and copy";
        }
      });
    }
  }



  // Newsletter subscription. A static site needs a mailing-list endpoint or
  // recipient address; configure newsletterEndpoint (preferred) or newsletterEmail
  // in site-config.js. Without either, show an explicit setup message.
  const subscribeForm = document.querySelector("#subscribe-form");
  if (subscribeForm) {
    const emailField = subscribeForm.querySelector('[name="email"]');
    const feedback = document.querySelector("#subscribe-feedback");
    const newsletterEndpoint = String(config.newsletterEndpoint || "").trim();
    const newsletterEmail = String(config.newsletterEmail || contactEmail || "").trim();

    const setSubscribeFeedback = (message, state = "") => {
      if (!feedback) return;
      feedback.textContent = message;
      feedback.classList.remove("is-error", "is-success");
      if (state) feedback.classList.add(`is-${state}`);
    };

    subscribeForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!subscribeForm.reportValidity()) return;
      const email = String(emailField.value || "").trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setSubscribeFeedback("Please enter a valid email address.", "error");
        return;
      }

      if (newsletterEndpoint) {
        let endpointUrl;
        try { endpointUrl = new URL(newsletterEndpoint); } catch (_error) { endpointUrl = null; }
        if (!endpointUrl || !["https:", "http:"].includes(endpointUrl.protocol)) {
          setSubscribeFeedback("The newsletter endpoint in site-config.js is not a valid HTTP or HTTPS URL.", "error");
          return;
        }
        const submitButton = subscribeForm.querySelector('button[type="submit"]');
        if (submitButton) { submitButton.disabled = true; submitButton.textContent = "Submitting…"; }
        try {
          const response = await fetch(endpointUrl.href, {
            method: "POST",
            headers: { "Accept": "application/json", "Content-Type": "application/json" },
            body: JSON.stringify({ email, source: "ShafiqHub newsletter" })
          });
          if (!response.ok) throw new Error(`Subscription endpoint returned ${response.status}`);
          setSubscribeFeedback("Thanks for subscribing. Your email has been submitted successfully.", "success");
          subscribeForm.reset();
        } catch (_error) {
          setSubscribeFeedback("We couldn't submit your subscription. Please try again later.", "error");
        } finally {
          if (submitButton) { submitButton.disabled = false; submitButton.innerHTML = 'Subscribe <span aria-hidden="true">→</span>'; }
        }
        return;
      }

      if (newsletterEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newsletterEmail)) {
        const subject = "Subscribe to ShafiqHub updates";
        const body = `Please add this email address to the ShafiqHub updates list:\n\n${email}\n\nI understand this is a request to receive occasional ShafiqHub updates.`;
        window.location.href = `mailto:${newsletterEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        setSubscribeFeedback("Your email app should open with a subscription request. Send that message to complete sign-up.", "success");
        return;
      }

      setSubscribeFeedback("Newsletter sign-up is ready, but it is not connected yet. Add newsletterEndpoint or newsletterEmail in site-config.js to receive subscriptions.", "error");
    });
  }

  // Blog article detail page. Content lives locally in this file, so no backend is needed.
  const articleRoot = document.querySelector("#article-content");
  if (articleRoot) {
    const posts = {
      "simple-tools": {
        category: "Design & thinking",
        readTime: "5 min read",
        title: "Why the best tools make complexity disappear",
        intro: "The best tools do not ask people to learn more steps. They make the important steps easier to see and easier to complete.",
        sections: [
          ["Clarity is a feature", "A product can have dozens of capabilities and still feel simple. The difference is whether people can understand what to do next. Clear labels, sensible defaults, and a focused interface reduce the mental effort required to get started."],
          ["Remove decisions that do not matter", "Every unnecessary choice adds friction. Good defaults, helpful presets, and a consistent layout allow people to focus on their task instead of configuring the tool around it."],
          ["Make the next step obvious", "People should not have to guess where to go next. A clear primary action, useful feedback, and an easy way to recover from mistakes create confidence."],
          ["A useful test", "Ask someone to complete the main task without explaining the interface. Notice where they pause, hesitate, or ask questions. Those moments reveal where complexity is hiding."]
        ]
      },
      "small-automations": {
        category: "Productivity",
        readTime: "4 min read",
        title: "Small automations, meaningful time savings",
        intro: "Automation does not need to begin with a complex system. Often, one small improvement to a repeated task is enough to make a noticeable difference.",
        sections: [
          ["Start with repetition", "Look for tasks that happen the same way every day or week: renaming files, sorting messages, preparing a report, or copying information between tools. Repetition is a useful signal that a workflow may be simplified."],
          ["Automate the boring part", "Keep the human decision where it adds value. Let a script handle predictable formatting or movement of information, while a person reviews exceptions and makes the judgement calls."],
          ["Keep it understandable", "A helpful automation should be easy to pause, inspect, and correct. Clear logs, simple settings, and safe defaults make small tools more dependable."],
          ["Measure the saved effort", "Estimate how long the task took before and after the change. Even a few minutes saved repeatedly can add up, especially when the automation reduces errors too."]
        ]
      },
      "first-version": {
        category: "Building things",
        readTime: "6 min read",
        title: "From a rough idea to a useful first version",
        intro: "A promising idea becomes more useful when it meets a real task. The first version should test the central assumption, not attempt to include every possible feature.",
        sections: [
          ["Describe the problem first", "Write down who experiences the problem, when it happens, and what people currently do to work around it. A precise problem statement is more useful than a long feature list."],
          ["Choose one important outcome", "Decide what a successful first version should help someone accomplish. Make that outcome small enough to build and clear enough to test."],
          ["Build the shortest useful path", "Create only the screens, actions, and information needed to complete the main task. Avoid adding settings and edge-case features before learning whether the core flow works."],
          ["Learn, then improve", "Put the prototype in front of someone who has the problem. Watch how they use it, ask what felt unclear, and improve the next version based on what you learn."]
        ]
      }
    };

    const postId = new URLSearchParams(window.location.search).get("post") || "";
    const post = posts[postId];
    if (!post) {
      articleRoot.innerHTML = '<div class="article-not-found"><p class="section-kicker">Article unavailable</p><h1>We could not find that article.</h1><p>It may have moved, or the link may be incomplete.</p><a class="button button-primary" href="blogs.html">Back to Blogs <span aria-hidden="true">→</span></a></div>';
    } else {
      document.title = `${post.title} — ShafiqHub`;
      const paragraphs = post.sections.map(([heading, text]) => `<section><h2>${heading}</h2><p>${text}</p></section>`).join("");
      articleRoot.innerHTML = `<div class="article-top"><a class="back-link" href="blogs.html">← All articles</a><div class="blog-meta"><span>${post.category}</span><span>${post.readTime}</span></div></div><header class="article-heading"><p class="section-kicker">Notes from the lab</p><h1>${post.title}</h1><p class="article-intro">${post.intro}</p></header><div class="article-body">${paragraphs}</div><div class="article-end"><p>Enjoyed this piece? Explore more ideas from the lab.</p><a class="button button-primary" href="blogs.html">More articles <span aria-hidden="true">→</span></a></div>`;
    }
  }
})();
