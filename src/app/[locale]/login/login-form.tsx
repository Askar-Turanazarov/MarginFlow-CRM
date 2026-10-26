"use client";

import { Eye, EyeOff, LogIn } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { login, type LoginState } from "@/app/actions";
import { Field, FormError } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const t = useTranslations("login");
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  const [visible, setVisible] = useState(false);

  return (
    <form action={action} className="grid gap-4">
      <Field label={t("login")} htmlFor="login">
        <Input id="login" name="login" autoComplete="username" autoCapitalize="none" spellCheck={false} autoFocus required />
      </Field>
      <Field label={t("password")} htmlFor="password">
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={visible ? "text" : "password"}
            autoComplete="current-password"
            className="pr-11"
            required
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? t("hidePassword") : t("showPassword")}
            aria-pressed={visible}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:text-foreground"
          >
            {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </Field>
      <FormError>{state.error && t(state.error)}</FormError>
      <Button type="submit" size="lg" disabled={pending} className="mt-1 w-full">
        <LogIn />
        {pending ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
