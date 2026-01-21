import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type Locale = "en" | "vi";

const STORAGE_KEY = "app.locale";

const dict = {
  en: {
    appName: "Medical Imaging Platform",
    // Common
    back: "Back",
    saveChanges: "Save Changes",
    saving: "Saving...",
    settings: "Settings",
    theme: "Theme",
    current: "Current",
    switchToLight: "Switch to Light",
    switchToDark: "Switch to Dark",
    language: "Language",
    english: "English",
    vietnamese: "Vietnamese",

    // Settings page
    uploadNewProfilePicture: "Upload a new profile picture",
    accountInformation: "Account Information",
    updateYourPersonalDetails: "Update your personal details below.",
    firstName: "First Name",
    lastName: "Last Name",
    email: "Email",
    profileUpdated: "Profile Updated",
    yourInfoSaved: "Your information has been saved.",
    updateFailed: "Update Failed",
    unableToSaveTryAgain: "Unable to save changes. Try again.",
    error: "Error",
    firstLastCannotBeEmpty: "First name and last name cannot be empty.",

    // Auth
    signIn: "Sign In",
    createAccount: "Create account",
    signUp: "Sign Up",
  },
  vi: {
    appName: "Nền tảng Chẩn đoán Hình ảnh",
    // Common
    back: "Quay lại",
    saveChanges: "Lưu thay đổi",
    saving: "Đang lưu...",
    settings: "Cài đặt",
    theme: "Giao diện",
    current: "Hiện tại",
    switchToLight: "Chuyển sang Sáng",
    switchToDark: "Chuyển sang Tối",
    language: "Ngôn ngữ",
    english: "Tiếng Anh",
    vietnamese: "Tiếng Việt",

    // Settings page
    uploadNewProfilePicture: "Tải ảnh đại diện mới",
    accountInformation: "Thông tin tài khoản",
    updateYourPersonalDetails: "Cập nhật thông tin cá nhân bên dưới.",
    firstName: "Tên",
    lastName: "Họ",
    email: "Email",
    profileUpdated: "Đã cập nhật hồ sơ",
    yourInfoSaved: "Thông tin của bạn đã được lưu.",
    updateFailed: "Cập nhật thất bại",
    unableToSaveTryAgain: "Không thể lưu thay đổi. Vui lòng thử lại.",
    error: "Lỗi",
    firstLastCannotBeEmpty: "Tên và họ không được để trống.",

    // Auth
    signIn: "Đăng nhập",
    createAccount: "Tạo tài khoản",
    signUp: "Đăng ký",
  },
} as const;

type Dict = typeof dict.en;

type I18nContextValue = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (k: keyof Dict) => string;
};

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (saved === "en" || saved === "vi") setLocaleState(saved);
  }, []);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    localStorage.setItem(STORAGE_KEY, l);
  };

  const t = (k: keyof Dict) => dict[locale][k] ?? dict.en[k];

  const value = useMemo(() => ({ locale, setLocale, t }), [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
