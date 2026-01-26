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

    // Login page
    password: "Password",
    rememberMe: "Remember me",
    loginSuccessful: "Login successful",
    loginFailed: "Login failed",
    welcomeBack: "Welcome back! Redirecting to your dashboard...",
    invalidEmail: "Enter a valid email address.",
    emailRequired: "Email is required.",
    passwordRequired: "Password is required.",
    offlineError: "You appear to be offline. Check your connection.",
    tooManyAttempts: "Too many attempts. Please wait and try again.",
    networkError: "Network error. Please try again.",
    invalidCredentials: "Email or password is incorrect.",

    // Signup page
    joinCommunity: "Join the learning community",
    firstNameRequired: "First name is required.",
    lastNameRequired: "Last name is required.",
    selectRole: "Please select your role.",
    student: "Student",
    instructor: "Instructor",
    passwordWeak: "Use at least 8 characters with letters and numbers.",
    confirmPassword: "Confirm Password",
    confirmPasswordRequired: "Please confirm your password.",
    passwordsDoNotMatch: "Passwords do not match.",
    signupSuccessTitle: "Welcome",
    signupSuccessDesc: "Your account is ready. We’re setting up your dashboard…",
    signupFailed: "Signup failed",
    signupFailedDesc: "Unable to create your account. Please try again.",
    creatingAccount: "Creating account...",
    role: "Role",

    // Home / Navbar
    dashboard: "Dashboard",
    cases: "Cases",
    logout: "Logout",
    getStarted: "Get started",
    quickLinks: "Quick links",
    instructorDashboard: "Instructor Dashboard",
    studentDashboard: "Student Dashboard",
    caseLibrary: "Case Library",
    tipNavbar: "Tip: Use the navbar to jump between your dashboard and cases.",
    heroTitle: "Learn medical imaging with hands-on annotations",
    heroDescription: "Collaborate with instructors and peers, annotate real cases, and track your progress — all in one place.",

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

    // Login page
    password: "Mật khẩu",
    rememberMe: "Ghi nhớ đăng nhập",
    loginSuccessful: "Đăng nhập thành công",
    loginFailed: "Đăng nhập thất bại",
    welcomeBack: "Chào mừng quay lại! Đang chuyển đến bảng điều khiển...",
    invalidEmail: "Vui lòng nhập email hợp lệ.",
    emailRequired: "Email là bắt buộc.",
    passwordRequired: "Mật khẩu là bắt buộc.",
    offlineError: "Bạn đang ngoại tuyến. Vui lòng kiểm tra kết nối.",
    tooManyAttempts: "Quá nhiều lần thử. Vui lòng chờ và thử lại.",
    networkError: "Lỗi mạng. Vui lòng thử lại.",
    invalidCredentials: "Email hoặc mật khẩu không đúng.",

    // Signup page
    joinCommunity: "Tham gia cộng đồng học tập",
    firstNameRequired: "Tên là bắt buộc.",
    lastNameRequired: "Họ là bắt buộc.",
    selectRole: "Vui lòng chọn vai trò.",
    student: "Sinh viên",
    instructor: "Giảng viên",
    passwordWeak: "Mật khẩu phải có ít nhất 8 ký tự gồm chữ và số.",
    confirmPassword: "Xác nhận mật khẩu",
    confirmPasswordRequired: "Vui lòng xác nhận mật khẩu.",
    passwordsDoNotMatch: "Mật khẩu không khớp.",
    signupSuccessTitle: "Chào mừng",
    signupSuccessDesc: "Tài khoản của bạn đã sẵn sàng. Đang chuyển đến bảng điều khiển…",
    signupFailed: "Đăng ký thất bại",
    signupFailedDesc: "Không thể tạo tài khoản. Vui lòng thử lại.",
    creatingAccount: "Đang tạo tài khoản...",
    role: "Vai trò",

    // Home / Navbar
    dashboard: "Bảng điều khiển",
    cases: "Ca bệnh",
    logout: "Đăng xuất",
    getStarted: "Bắt đầu",
    quickLinks: "Liên kết nhanh",
    instructorDashboard: "Bảng điều khiển giảng viên",
    studentDashboard: "Bảng điều khiển sinh viên",
    caseLibrary: "Thư viện ca bệnh",
    tipNavbar:"Mẹo: Sử dụng thanh điều hướng để chuyển nhanh giữa bảng điều khiển và ca bệnh.",
    heroTitle: "Học chẩn đoán hình ảnh với chú thích thực hành",
    heroDescription:"Hợp tác với giảng viên và bạn học, chú thích ca bệnh thực tế và theo dõi tiến trình — tất cả trong một nền tảng.",

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
