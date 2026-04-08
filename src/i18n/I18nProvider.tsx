import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Language, translateText } from './translations';

const LANGUAGE_STORAGE_KEY = 'app_language';

type I18nContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
  t: (text: string) => string;
  formatDate: (value: number | string | Date, options?: Intl.DateTimeFormatOptions) => string;
  formatDateTime: (value: number | string | Date, options?: Intl.DateTimeFormatOptions) => string;
  localizeNode: (node: React.ReactNode) => React.ReactNode;
};

const I18nContext = createContext<I18nContextValue | null>(null);

const textNodeOriginals = new WeakMap<Text, string>();
const attributeOriginals = new WeakMap<Element, Record<string, string>>();

const getStoredLanguage = (): Language => {
  const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return stored === 'en-US' ? 'en-US' : 'zh-CN';
};

const shouldIgnoreElement = (element: Element | null) => {
  if (!element) {
    return true;
  }

  const ignoredTags = ['SCRIPT', 'STYLE', 'NOSCRIPT'];
  if (ignoredTags.includes(element.tagName)) {
    return true;
  }

  return Boolean(element.closest('[data-i18n-ignore="true"]'));
};

const translateAttributes = (element: Element, language: Language) => {
  const translatableAttributes = ['placeholder', 'title', 'aria-label'];
  const stored = attributeOriginals.get(element) || {};

  translatableAttributes.forEach((attribute) => {
    if (!element.hasAttribute(attribute)) {
      return;
    }

    if (!stored[attribute]) {
      stored[attribute] = element.getAttribute(attribute) || '';
    }

    const translated = translateText(stored[attribute], language);
    if (element.getAttribute(attribute) !== translated) {
      element.setAttribute(attribute, translated);
    }
  });

  attributeOriginals.set(element, stored);
};

const translateTree = (root: Node, language: Language) => {
  if (root instanceof Element && shouldIgnoreElement(root)) {
    return;
  }

  const handleTextNode = (textNode: Text) => {
    const parent = textNode.parentElement;
    if (!parent || shouldIgnoreElement(parent)) {
      return;
    }

    if (!textNodeOriginals.has(textNode)) {
      textNodeOriginals.set(textNode, textNode.nodeValue || '');
    }

    const original = textNodeOriginals.get(textNode) || '';
    const translated = translateText(original, language);
    if (textNode.nodeValue !== translated) {
      textNode.nodeValue = translated;
    }
  };

  if (root instanceof Text) {
    handleTextNode(root);
    return;
  }

  if (root instanceof Element) {
    translateAttributes(root, language);
  }

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();
  while (current) {
    if (current instanceof Text) {
      handleTextNode(current);
    } else if (current instanceof Element && !shouldIgnoreElement(current)) {
      translateAttributes(current, language);
    }
    current = walker.nextNode();
  }
};

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(getStoredLanguage);

  useEffect(() => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    document.documentElement.lang = language;

    let frameId = 0;
    let observer: MutationObserver | null = null;

    const runTranslation = () => {
      translateTree(document.body, language);
    };

    frameId = window.requestAnimationFrame(() => {
      runTranslation();

      observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => translateTree(node, language));
        });
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
    });

    return () => {
      window.cancelAnimationFrame(frameId);
      observer?.disconnect();
    };
  }, [language]);

  const value = useMemo<I18nContextValue>(
    () => {
      const localizeNode = (node: React.ReactNode): React.ReactNode => {
        if (typeof node === 'string') {
          return translateText(node, language);
        }

        if (Array.isArray(node)) {
          return node.map((child, index) => <React.Fragment key={index}>{localizeNode(child)}</React.Fragment>);
        }

        if (!React.isValidElement(node)) {
          return node;
        }

        const props = node.props as Record<string, unknown>;
        const nextProps: Record<string, unknown> = {};

        if (props.children !== undefined) {
          nextProps.children = localizeNode(props.children as React.ReactNode);
        }

        ['placeholder', 'title', 'aria-label', 'label', 'alt'].forEach((key) => {
          if (typeof props[key] === 'string') {
            nextProps[key] = translateText(props[key] as string, language);
          }
        });

        if (React.isValidElement(props.element)) {
          nextProps.element = localizeNode(props.element as React.ReactNode);
        }

        if (Array.isArray(props.options)) {
          nextProps.options = (props.options as unknown[]).map((option) => {
            if (
              option &&
              typeof option === 'object' &&
              'label' in (option as Record<string, unknown>) &&
              typeof (option as Record<string, unknown>).label === 'string'
            ) {
              return {
                ...(option as Record<string, unknown>),
                label: translateText((option as Record<string, unknown>).label as string, language),
              };
            }
            return option;
          });
        }

        return React.cloneElement(node, nextProps);
      };

      return {
        language,
        setLanguage: (nextLanguage) => setLanguageState(nextLanguage),
        toggleLanguage: () =>
          setLanguageState((current) => (current === 'zh-CN' ? 'en-US' : 'zh-CN')),
        t: (text) => translateText(text, language),
        formatDate: (value, options) =>
          new Date(value).toLocaleDateString(language, options),
        formatDateTime: (value, options) =>
          new Date(value).toLocaleString(language, options),
        localizeNode,
      };
    },
    [language]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
};
