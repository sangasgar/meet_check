'use client';

import { Alert, Button, Card, Spinner } from '@heroui/react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { ACCESS_TOKEN_KEY, API_URL, decodeJwtEmail } from '../lib/api';

interface Meeting {
  id: string;
  title: string;
  description: string | null;
  ownerId: string;
}

type State =
  | { kind: 'loading' }
  | { kind: 'ready'; meetings: Meeting[]; email: string | null }
  | { kind: 'error'; message: string };

const RECENT_MEETINGS_LIMIT = 3;

export default function HomePage() {
  const router = useRouter();
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [isCreating, setCreating] = useState(false);

  const logout = useCallback(() => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    router.replace('/login');
  }, [router]);

  useEffect(() => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token) {
      router.replace('/login');
      return;
    }
    const load = async () => {
      try {
        const response = await fetch(`${API_URL}/meetings`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(10_000),
        });

        if (response.status === 401) {
          logout();
          return;
        }
        if (!response.ok) {
          setState({ kind: 'error', message: 'Не удалось загрузить встречи. Обновите страницу.' });
          return;
        }

        setState({
          kind: 'ready',
          meetings: (await response.json()) as Meeting[],
          email: decodeJwtEmail(token),
        });
      } catch {
        setState({ kind: 'error', message: 'Сервер недоступен. Убедитесь, что API запущен.' });
      }
    };

    void load();
  }, [router, logout]);

  const createMeeting = async () => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token) {
      router.replace('/login');
      return;
    }

    const meetingsCount = state.kind === 'ready' ? state.meetings.length : 0;
    setCreating(true);
    try {
      const response = await fetch(`${API_URL}/meetings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: `Встреча №${meetingsCount + 1}` }),
        signal: AbortSignal.timeout(10_000),
      });

      if (response.status === 401) {
        logout();
        return;
      }
      if (!response.ok) {
        setState({ kind: 'error', message: 'Не удалось создать встречу. Попробуйте ещё раз.' });
        return;
      }

      const created = (await response.json()) as Meeting;
      setState((prev) =>
        prev.kind === 'ready' ? { ...prev, meetings: [...prev.meetings, created] } : prev,
      );
    } catch {
      setState({ kind: 'error', message: 'Сервер недоступен. Убедитесь, что API запущен.' });
    } finally {
      setCreating(false);
    }
  };

  const recentMeetings =
    state.kind === 'ready' ? state.meetings.slice(-RECENT_MEETINGS_LIMIT).reverse() : [];
  const email = state.kind === 'ready' ? state.email : null;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Привет{email ? `, ${email}` : ''}!</h1>
        <Button className="h-11" variant="ghost" onPress={logout}>
          Выйти
        </Button>
      </header>

      {state.kind === 'loading' && (
        <div className="flex justify-center py-16">
          <Spinner aria-label="Загрузка встреч" />
        </div>
      )}

      {state.kind === 'error' && (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Ошибка</Alert.Title>
            <Alert.Description>{state.message}</Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      {state.kind === 'ready' && (
        <>
          <Card>
            <Card.Content className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-lg">
                Всего встреч: <span className="font-semibold">{state.meetings.length}</span>
              </p>
              <Button className="h-11" isPending={isCreating} onPress={createMeeting}>
                {({ isPending }) => (
                  <>
                    {isPending ? <Spinner color="current" size="sm" /> : null}
                    Создать встречу
                  </>
                )}
              </Button>
            </Card.Content>
          </Card>

          <section aria-label="Последние встречи" className="flex flex-col gap-3">
            <h2 className="text-lg font-medium">Последние встречи</h2>

            {recentMeetings.length === 0 ? (
              <Card>
                <Card.Header>
                  <Card.Title>Встреч пока нет</Card.Title>
                  <Card.Description>
                    Нажмите «Создать встречу», чтобы добавить первую.
                  </Card.Description>
                </Card.Header>
              </Card>
            ) : (
              recentMeetings.map((meeting) => (
                <Card key={meeting.id}>
                  <Card.Header>
                    <Card.Title>{meeting.title}</Card.Title>
                    {meeting.description && (
                      <Card.Description>{meeting.description}</Card.Description>
                    )}
                  </Card.Header>
                </Card>
              ))
            )}
          </section>
        </>
      )}
    </main>
  );
}
