import { useEffect } from 'react';

export function useAutoSave(formData: any, formId: string) {
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem(`form_${formId}`, JSON.stringify(formData));
    }, 5000);
    return () => clearTimeout(timer);
  }, [formData, formId]);
}

export function useRestoreForm(formId: string, setFormData: (data: any) => void) {
  useEffect(() => {
    const saved = localStorage.getItem(`form_${formId}`);
    if (saved && saved !== "undefined") {
      try {
        setFormData(JSON.parse(saved));
      } catch (e) {
        // Optionally log or ignore
      }
    }
  }, [formId, setFormData]);
}

export function useUrlState(key: string, value: any, setValue: (v: any) => void) {
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set(key, JSON.stringify(value));
    window.history.replaceState({}, '', url.toString());
  }, [key, value]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const saved = params.get(key);
    if (saved) {
      setValue(JSON.parse(saved));
    }
  }, [key, setValue]);
}
