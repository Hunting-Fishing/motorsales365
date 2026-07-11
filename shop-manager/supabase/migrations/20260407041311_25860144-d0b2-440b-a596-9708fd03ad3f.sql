DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'gd_chat_messages' AND policyname = 'Shop isolation update on gd_chat_messages') THEN
    CREATE POLICY "Shop isolation update on gd_chat_messages"
      ON public.gd_chat_messages FOR UPDATE TO authenticated
      USING (EXISTS (
        SELECT 1 FROM public.gd_chat_conversations c
        WHERE c.id = gd_chat_messages.conversation_id
        AND c.shop_id = public.get_current_user_shop_id()
      ));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'gd_webhook_logs' AND policyname = 'Shop isolation update on gd_webhook_logs') THEN
    CREATE POLICY "Shop isolation update on gd_webhook_logs"
      ON public.gd_webhook_logs FOR UPDATE TO authenticated
      USING (EXISTS (
        SELECT 1 FROM public.gd_webhooks w
        WHERE w.id = gd_webhook_logs.webhook_id
        AND w.shop_id = public.get_current_user_shop_id()
      ));
  END IF;
END $$;