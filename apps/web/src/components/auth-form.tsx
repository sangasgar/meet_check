'use client';

import { Eye, EyeSlash } from '@gravity-ui/icons';
import {
  Alert,
  Button,
  Card,
  FieldError,
  Form,
  Input,
  InputGroup,
  Label,
  Spinner,
  TextField,
} from '@heroui/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

import { ACCESS_TOKEN_KEY, API_URL } from '../lib/api';

const EMAIL_PATTERN = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
const EMAIL_MAX_LENGTH = 254;
const PASSWORD_MAX_LENGTH = 72;
const REQUEST_TIMEOUT_MS = 10_000;

const validateEmail = (value: string): string | null => {
  if (!value.trim()) return 'Введите e-mail';
  if (value.length > EMAIL_MAX_LENGTH)
    return `E-mail не может быть длиннее ${EMAIL_MAX_LENGTH} символов`;
  if (!EMAIL_PATTERN.test(value)) return 'Введите корректный email';
  return null;
};

const validatePassword = (value: string): string | null => {
  if (!value) return 'Введите пароль';
  if (value.length > PASSWORD_MAX_LENGTH)
    return `Пароль не может быть длиннее ${PASSWORD_MAX_LENGTH} символов`;
  return null;
};

const MODE_TEXTS = {
  register: {
    title: 'Регистрация',
    description: 'Создайте аккаунт, чтобы планировать встречи',
    submit: 'Зарегистрироваться',
    passwordAutocomplete: 'new-password',
    switchQuestion: 'Уже есть аккаунт?',
    switchHref: '/login',
    switchLabel: 'Войти',
  },
  login: {
    title: 'Вход',
    description: 'Войдите, чтобы продолжить работу со встречами',
    submit: 'Войти',
    passwordAutocomplete: 'current-password',
    switchQuestion: 'Нет аккаунта?',
    switchHref: '/register',
    switchLabel: 'Зарегистрироваться',
  },
} as const;

interface ServerError {
  message: string;
  showLoginLink?: boolean;
}

export function AuthForm({ mode }: { mode: 'register' | 'login' }) {
  const texts = MODE_TEXTS[mode];
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isPasswordVisible, setPasswordVisible] = useState(false);
  const [isSubmitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<ServerError | null>(null);

  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextEmailError = validateEmail(email);
    const nextPasswordError = validatePassword(password);
    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);
    if (nextEmailError || nextPasswordError) {
      (nextEmailError ? emailInputRef : passwordInputRef).current?.focus();
      return;
    }

    setSubmitting(true);
    setServerError(null);
    try {
      const response = await fetch(`${API_URL}/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (response.ok) {
        const { accessToken } = (await response.json()) as { accessToken: string };
        localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
        router.push('/');
        return;
      }

      if (mode === 'register' && response.status === 409) {
        setServerError({
          message: 'Пользователь с таким e-mail уже зарегистрирован.',
          showLoginLink: true,
        });
      } else if (mode === 'login' && response.status === 401) {
        setServerError({ message: 'Неверный e-mail или пароль.' });
      } else {
        setServerError({
          message: 'Не удалось выполнить запрос. Проверьте введённые данные и попробуйте ещё раз.',
        });
      }
    } catch (error) {
      setServerError({
        message:
          error instanceof DOMException && error.name === 'TimeoutError'
            ? 'Сервер долго не отвечает. Попробуйте ещё раз через минуту.'
            : 'Сервер недоступен. Убедитесь, что API запущен, и повторите попытку.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <Card.Header>
          <Card.Title>{texts.title}</Card.Title>
          <Card.Description>{texts.description}</Card.Description>
        </Card.Header>
        <Card.Content>
          <Form className="flex flex-col gap-4" validationBehavior="aria" onSubmit={onSubmit}>
            <TextField
              isRequired
              className="w-full"
              isInvalid={emailError !== null}
              name="email"
              type="email"
              value={email}
              onBlur={() => {
                if (email) setEmailError(validateEmail(email));
              }}
              onChange={(value) => {
                setEmail(value);
                setEmailError(null);
              }}
            >
              <Label>E-mail</Label>
              <Input
                ref={emailInputRef}
                autoComplete="email"
                className="h-11"
                maxLength={EMAIL_MAX_LENGTH + 1}
                placeholder="you@example.com"
              />
              <FieldError>{emailError}</FieldError>
            </TextField>

            <TextField
              isRequired
              className="w-full"
              isInvalid={passwordError !== null}
              name="password"
              value={password}
              onBlur={() => {
                if (password) setPasswordError(validatePassword(password));
              }}
              onChange={(value) => {
                setPassword(value);
                setPasswordError(null);
              }}
            >
              <Label>Пароль</Label>
              <InputGroup>
                <InputGroup.Input
                  ref={passwordInputRef}
                  autoComplete={texts.passwordAutocomplete}
                  className="h-11"
                  maxLength={PASSWORD_MAX_LENGTH + 1}
                  placeholder="Введите пароль"
                  type={isPasswordVisible ? 'text' : 'password'}
                />
                <InputGroup.Suffix className="pr-0">
                  <Button
                    isIconOnly
                    aria-label={isPasswordVisible ? 'Скрыть пароль' : 'Показать пароль'}
                    size="sm"
                    variant="ghost"
                    onPress={() => setPasswordVisible((visible) => !visible)}
                  >
                    {isPasswordVisible ? (
                      <Eye className="size-4" />
                    ) : (
                      <EyeSlash className="size-4" />
                    )}
                  </Button>
                </InputGroup.Suffix>
              </InputGroup>
              <FieldError>{passwordError}</FieldError>
            </TextField>

            {serverError && (
              <Alert status="danger">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Title>Не получилось</Alert.Title>
                  <Alert.Description>
                    {serverError.message}
                    {serverError.showLoginLink && (
                      <>
                        {' '}
                        <Link className="font-medium underline" href="/login">
                          Войти
                        </Link>
                      </>
                    )}
                  </Alert.Description>
                </Alert.Content>
              </Alert>
            )}

            <Button className="h-11 w-full" isPending={isSubmitting} type="submit">
              {({ isPending }) => (
                <>
                  {isPending ? <Spinner color="current" size="sm" /> : null}
                  {texts.submit}
                </>
              )}
            </Button>

            <p className="text-center text-sm text-muted">
              {texts.switchQuestion}{' '}
              <Link className="font-medium text-accent underline" href={texts.switchHref}>
                {texts.switchLabel}
              </Link>
            </p>
          </Form>
        </Card.Content>
      </Card>
    </main>
  );
}
