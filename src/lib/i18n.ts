/**
 * Internationalization (i18n) system
 * Inspired by airi's i18n packages
 * Supports Vietnamese and English
 */

export type Locale = 'vi' | 'en'

const translations: Record<Locale, Record<string, string>> = {
  vi: {
    // Chat
    'chat.title': 'AMI Chat AI',
    'chat.online': 'Trực tuyến',
    'chat.thinking': 'Đang suy nghĩ...',
    'chat.loading': 'Đang tải...',
    'chat.hello': 'Xin chào! Tôi là AMI 💜',
    'chat.intro': 'Trợ lý AI của HQG VNSO. Hãy hỏi tôi bất cứ điều gì!',
    'chat.disclaimer': 'AMI có thể mắc lỗi. Hãy kiểm tra thông tin quan trọng.',
    'chat.placeholder': 'Nhập tin nhắn...',
    'chat.send': 'Gửi',
    'chat.new': 'Chat mới',
    'chat.history': 'Lịch sử chat',
    'chat.noConversations': 'Chưa có cuộc trò chuyện',
    'chat.search': 'Tìm kiếm cuộc trò chuyện...',
    'chat.export': 'Xuất cuộc trò chuyện',
    'chat.pin': 'Ghim',
    'chat.unpin': 'Bỏ ghim',

    // Character
    'char.select': 'Chọn nhân vật',
    'char.search': 'Tìm kiếm nhân vật...',
    'char.expressions': 'Biểu cảm',
    'char.actions': 'Hành động',
    'char.3dExpressions': 'Biểu cảm 3D',
    'char.outfit': 'Trang phục',

    // Emotions
    'emotion.happy': '😊 Vui',
    'emotion.sad': '😢 Buồn',
    'emotion.angry': '😠 Giận',
    'emotion.surprised': '😲 Ngạc nhiên',
    'emotion.relaxed': '😌 Thư giãn',
    'emotion.neutral': '😐 Bình thường',
    'emotion.fun': '🎉 Vui vẻ',

    // Settings
    'settings.title': 'Cài đặt',
    'settings.general': 'Chung',
    'settings.profile': 'Hồ sơ',
    'settings.memory': 'Bộ nhớ',
    'settings.feedback': 'Phản hồi',
    'settings.about': 'Giới thiệu',
    'settings.language': 'Ngôn ngữ',
    'settings.background': 'Hình nền',
    'settings.customBg': 'Hình nền tùy chỉnh',

    // Profile
    'profile.name': 'Tên hiển thị',
    'profile.bio': 'Tiểu sử',
    'profile.customPrompt': 'Lời nhắn tùy chỉnh cho AI',
    'profile.changePassword': 'Đổi mật khẩu',
    'profile.currentPassword': 'Mật khẩu hiện tại',
    'profile.newPassword': 'Mật khẩu mới',
    'profile.save': 'Lưu thay đổi',

    // Memory
    'memory.title': 'Bộ nhớ AI',
    'memory.description': 'AMI sẽ nhớ những điều này khi trò chuyện với bạn.',
    'memory.add': 'Thêm ghi nhớ',
    'memory.empty': 'Chưa có ghi nhớ nào.',
    'memory.delete': 'Xóa',

    // Auth
    'auth.login': 'Đăng nhập',
    'auth.register': 'Đăng ký',
    'auth.logout': 'Đăng xuất',
    'auth.email': 'Email',
    'auth.password': 'Mật khẩu',
    'auth.forgotPassword': 'Quên mật khẩu?',
    'auth.resetPassword': 'Đặt lại mật khẩu',

    // Admin
    'admin.title': 'Quản trị',
    'admin.dashboard': 'Bảng điều khiển',
    'admin.users': 'Người dùng',
    'admin.providers': 'Nhà cung cấp AI',
    'admin.models': 'Model AI',
    'admin.characters': 'Nhân vật',
    'admin.settings': 'Cài đặt hệ thống',

    // Common
    'common.save': 'Lưu',
    'common.cancel': 'Hủy',
    'common.delete': 'Xóa',
    'common.edit': 'Sửa',
    'common.close': 'Đóng',
    'common.confirm': 'Xác nhận',
    'common.success': 'Thành công',
    'common.error': 'Lỗi',
    'common.loading': 'Đang tải...',
  },

  en: {
    // Chat
    'chat.title': 'AMI Chat AI',
    'chat.online': 'Online',
    'chat.thinking': 'Thinking...',
    'chat.loading': 'Loading...',
    'chat.hello': 'Hello! I\'m AMI 💜',
    'chat.intro': 'HQG VNSO AI Assistant. Ask me anything!',
    'chat.disclaimer': 'AMI can make mistakes. Please verify important information.',
    'chat.placeholder': 'Type a message...',
    'chat.send': 'Send',
    'chat.new': 'New Chat',
    'chat.history': 'Chat History',
    'chat.noConversations': 'No conversations yet',
    'chat.search': 'Search conversations...',
    'chat.export': 'Export conversation',
    'chat.pin': 'Pin',
    'chat.unpin': 'Unpin',

    // Character
    'char.select': 'Select Character',
    'char.search': 'Search characters...',
    'char.expressions': 'Expressions',
    'char.actions': 'Actions',
    'char.3dExpressions': '3D Expressions',
    'char.outfit': 'Outfit',

    // Emotions
    'emotion.happy': '😊 Happy',
    'emotion.sad': '😢 Sad',
    'emotion.angry': '😠 Angry',
    'emotion.surprised': '😲 Surprised',
    'emotion.relaxed': '😌 Relaxed',
    'emotion.neutral': '😐 Neutral',
    'emotion.fun': '🎉 Fun',

    // Settings
    'settings.title': 'Settings',
    'settings.general': 'General',
    'settings.profile': 'Profile',
    'settings.memory': 'Memory',
    'settings.feedback': 'Feedback',
    'settings.about': 'About',
    'settings.language': 'Language',
    'settings.background': 'Background',
    'settings.customBg': 'Custom Background',

    // Profile
    'profile.name': 'Display Name',
    'profile.bio': 'Bio',
    'profile.customPrompt': 'Custom AI Instructions',
    'profile.changePassword': 'Change Password',
    'profile.currentPassword': 'Current Password',
    'profile.newPassword': 'New Password',
    'profile.save': 'Save Changes',

    // Memory
    'memory.title': 'AI Memory',
    'memory.description': 'AMI will remember these facts when chatting with you.',
    'memory.add': 'Add Memory',
    'memory.empty': 'No memories yet.',
    'memory.delete': 'Delete',

    // Auth
    'auth.login': 'Sign In',
    'auth.register': 'Sign Up',
    'auth.logout': 'Sign Out',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.forgotPassword': 'Forgot Password?',
    'auth.resetPassword': 'Reset Password',

    // Admin
    'admin.title': 'Admin',
    'admin.dashboard': 'Dashboard',
    'admin.users': 'Users',
    'admin.providers': 'AI Providers',
    'admin.models': 'AI Models',
    'admin.characters': 'Characters',
    'admin.settings': 'System Settings',

    // Common
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.close': 'Close',
    'common.confirm': 'Confirm',
    'common.success': 'Success',
    'common.error': 'Error',
    'common.loading': 'Loading...',
  },
}

let currentLocale: Locale = 'vi'

export function setLocale(locale: Locale) {
  currentLocale = locale
  if (typeof window !== 'undefined') {
    localStorage.setItem('ami.locale', locale)
  }
}

export function getLocale(): Locale {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('ami.locale') as Locale
    if (stored && translations[stored]) {
      currentLocale = stored
    }
  }
  return currentLocale
}

export function t(key: string, locale?: Locale): string {
  const l = locale || currentLocale
  return translations[l]?.[key] || translations['vi']?.[key] || key
}

export function getAvailableLocales(): { code: Locale; name: string }[] {
  return [
    { code: 'vi', name: 'Tiếng Việt' },
    { code: 'en', name: 'English' },
  ]
}
