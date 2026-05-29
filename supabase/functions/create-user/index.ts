import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify the caller is authenticated and is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create a client with the user's JWT to verify their identity
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "No autenticado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if the caller is an admin
    const { data: membership, error: memberError } = await supabaseUser
      .from("org_members")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["super_admin", "owner", "admin"])
      .maybeSingle();

    if (memberError || !membership) {
      return new Response(
        JSON.stringify({ error: "No tienes permisos de administrador" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email, password, full_name, role, org_id } = await req.json();

    if (!email || !password || !full_name || !role || !org_id) {
      return new Response(
        JSON.stringify({ error: "Faltan campos requeridos: email, password, full_name, role, org_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: "La contraseña debe tener al menos 6 caracteres" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create the user with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: newUser, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email: email.trim().toLowerCase(),
        password,
        email_confirm: true,
        user_metadata: { full_name: full_name.trim() },
      });

    if (createError) {
      console.error("Error creating user:", createError);
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!newUser.user) {
      return new Response(
        JSON.stringify({ error: "No se pudo crear el usuario" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // The handle_new_user trigger will create the profile automatically.
    // The process_pending_invitations trigger will add to org_members if there's a pending invitation.
    // If not, we need to add them manually.
    const { data: existingMember } = await supabaseAdmin
      .from("org_members")
      .select("id")
      .eq("user_id", newUser.user.id)
      .eq("org_id", org_id)
      .maybeSingle();

    if (!existingMember) {
      const { error: memberInsertError } = await supabaseAdmin
        .from("org_members")
        .insert([{ org_id, user_id: newUser.user.id, role }]);

      if (memberInsertError) {
        console.error("Error adding member to org:", memberInsertError);
        // User was created but couldn't be added to org - still return success with warning
        return new Response(
          JSON.stringify({
            user_id: newUser.user.id,
            warning: "Usuario creado, pero hubo un error al agregarlo a la organización. Un admin debe agregarlo manualmente.",
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Also check if there's a pending invitation and mark it as accepted
    await supabaseAdmin
      .from("pending_invitations")
      .update({ status: "accepted", accepted_at: new Date().toISOString() })
      .eq("email", email.trim().toLowerCase())
      .eq("org_id", org_id)
      .eq("status", "pending");

    return new Response(
      JSON.stringify({ user_id: newUser.user.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Error interno del servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
