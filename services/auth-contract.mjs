export const PASSWORD_REQUIREMENTS = [
  { key: 'length', label: 'Ít nhất 8 ký tự', test: (value) => value.length >= 8 },
  { key: 'uppercase', label: 'Có chữ hoa', test: (value) => /[A-Z]/.test(value) },
  { key: 'lowercase', label: 'Có chữ thường', test: (value) => /[a-z]/.test(value) },
  { key: 'number', label: 'Có chữ số', test: (value) => /\d/.test(value) },
  { key: 'special', label: 'Có ký tự đặc biệt @$!%*?&', test: (value) => /[@$!%*?&]/.test(value) },
];

export const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

export function validateEmail(value) {
  const email = value.trim();
  if (!email) return 'Email là bắt buộc.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Email không hợp lệ.';
  return '';
}

export function validateRegistration({ fullName, email, password, confirmPassword }) {
  const errors = {};
  if (!fullName.trim()) errors.fullName = 'Họ và tên là bắt buộc.';
  const emailError = validateEmail(email);
  if (emailError) errors.email = emailError;
  if (!password) errors.password = 'Mật khẩu là bắt buộc.';
  else if (!STRONG_PASSWORD_REGEX.test(password)) errors.password = 'Mật khẩu chưa đáp ứng đầy đủ yêu cầu.';
  if (!confirmPassword) errors.confirmPassword = 'Vui lòng xác nhận mật khẩu.';
  else if (password !== confirmPassword) errors.confirmPassword = 'Mật khẩu xác nhận không khớp.';
  return errors;
}

export function getAuthErrorMessage(error, action = 'login') {
  const status = error?.statusCode;
  if (status === 403) return 'Tài khoản hiện đang bị khóa.';
  if (status === 429) return 'Bạn thử quá nhiều lần. Vui lòng thử lại sau.';
  if (status === 409) return 'Email đã được sử dụng.';
  if (status === 401) return 'Email hoặc mật khẩu không chính xác.';
  if (status === 400) {
    const message = Array.isArray(error?.details?.message) ? error.details.message[0] : error?.message;
    return message || 'Thông tin chưa hợp lệ. Vui lòng kiểm tra lại.';
  }
  if (status >= 500 || error?.name === 'TypeError') return 'Không thể kết nối máy chủ. Vui lòng thử lại.';
  return action === 'register' ? 'Không thể tạo tài khoản. Vui lòng thử lại.' : 'Email hoặc mật khẩu không chính xác.';
}
