import flet as ft
import urllib.request
import json
import base64
import uuid
import random
import threading
import time
import datetime
from collections import Counter
import ssl
import hashlib
import os  # <--- ДОБАВИЛИ ДЛЯ РАБОТЫ С ОБЛАЧНЫМ СЕРВЕРОМ

# ПРОБИВАЕМ БЛОКИРОВКУ WINDOWS ДЛЯ ОТПРАВКИ ДАННЫХ В ОБЛАКО
ssl._create_default_https_context = ssl._create_unverified_context

def main(page: ft.Page):
    # Настройки окна приложения
    page.title = "Spray Wall App"
    page.vertical_alignment = ft.MainAxisAlignment.START 
    page.horizontal_alignment = ft.CrossAxisAlignment.CENTER
    page.scroll = ft.ScrollMode.AUTO 
    page.theme_mode = ft.ThemeMode.DARK 
    page.window_width = 400
    page.window_height = 800

    # ==========================================
    #        ОБЛАЧНАЯ БАЗА ДАННЫХ (FIREBASE)
    # ==========================================
    FIREBASE_URL = "https://spray-wall-v2-default-rtdb.europe-west1.firebasedatabase.app/"

    def fetch_data(path):
        url = f"{FIREBASE_URL}{path}.json"
        try:
            req = urllib.request.Request(url)
            with urllib.request.urlopen(req) as response:
                return json.loads(response.read().decode('utf-8'))
        except Exception:
            return None

    def save_data(path, data=None, method="PUT"):
        url = f"{FIREBASE_URL}{path}.json"
        try:
            if data is not None:
                encoded_data = json.dumps(data).encode('utf-8')
                req = urllib.request.Request(url, data=encoded_data, method=method)
            else:
                req = urllib.request.Request(url, method=method)
            with urllib.request.urlopen(req) as response:
                pass
        except Exception as e:
            print(f"🔥 Ошибка сохранения [{path}]:", e)

    # ==========================================
    #        СОСТОЯНИЕ ПРИЛОЖЕНИЯ
    # ==========================================
    current_color = "green" 
    is_delete_mode = False
    current_gym_id = None       
    current_gym_role = "user"   
    current_tab = "official"    
    current_open_boulder_data = {} 
    current_other_user_id = None 
    
    ALL_GRADES = ["All", "1", "2", "3", "4A", "4B", "4C", "5A", "5A+", "5B", "5B+", "5C", "5C+", "6A", "6A+", "6B", "6B+", "6C", "6C+", "7A", "7A+", "7B", "7B+", "7C", "7C+", "8A", "8A+", "8B", "8B+", "8C"]
    EDIT_GRADES = [g for g in ALL_GRADES if g != "All"]

    def sanitize_grade(grade_str):
        if not grade_str: return ""
        return str(grade_str).upper().replace('А', 'A').replace('В', 'B').replace('С', 'C')

    def create_btn(text, on_click, bgcolor="blue", color="white", width=None, height=40, visible=True):
        return ft.Container(
            content=ft.Text(text, color=color, weight="bold", text_align="center"),
            bgcolor=bgcolor, padding=10, border_radius=5,
            width=width, height=height,
            alignment=ft.Alignment(0, 0),
            on_click=on_click, ink=True, visible=visible
        )

    # ==========================================
    #        УВЕДОМЛЕНИЯ
    # ==========================================
    notify_text = ft.Text("", color="white", weight="bold", text_align="center")
    notify_box = ft.Container(content=notify_text, bgcolor="green", padding=10, border_radius=5, visible=False, alignment=ft.Alignment(0,0))

    def show_notify(msg, is_error=False):
        notify_text.value = msg
        notify_box.bgcolor = "red" if is_error else "green"
        notify_box.visible = True
        page.update()
        def hide():
            time.sleep(3)
            notify_box.visible = False
            page.update()
        threading.Thread(target=hide).start()

    # ==========================================
    #        РАБОТА С ПРОФИЛЕМ ЮЗЕРА
    # ==========================================
    def get_profile_data():
        default_data = {
            "user_id": str(uuid.uuid4()), 
            "email": "",
            "name": "",        
            "first_name": "",  
            "last_name": "",   
            "bio": "Bouldering Enthusiast", 
            "avatar_b64": "", 
            "ascents_history": [],
            "is_global_admin": False
        }
        data = page.client_storage.get("user_profile")
        if data:
            for k, v in default_data.items():
                if k not in data: data[k] = v
            return data
        
        page.client_storage.set("user_profile", default_data)
        return default_data

    def save_profile_data(data):
        page.client_storage.set("user_profile", data)
        if "user_id" in data and data.get("name"):
            save_data(f"users/{data['user_id']}", {
                "nickname": data.get('name', ''),
                "first_name": data.get('first_name', ''),
                "last_name": data.get('last_name', ''),
                "email": data.get('email', ''), 
                "avatar_b64": data.get('avatar_b64', ''),
                "bio": data.get('bio', '')
            })

    def get_gyms_data():
        gyms_data = fetch_data("gyms")
        if isinstance(gyms_data, dict): return list(gyms_data.values())
        elif isinstance(gyms_data, list): return [g for g in gyms_data if g is not None]
        return []

    # ==========================================
    #        ГЛОБАЛЬНЫЙ FILE PICKER
    # ==========================================
    temp_avatar_b64 = "" 
    file_picker_context = "" 

    def on_file_picked(e):
        nonlocal temp_avatar_b64, file_picker_context
        if e.files and len(e.files) > 0:
            try:
                with open(e.files[0].path, "rb") as img_file: 
                    b64_img = base64.b64encode(img_file.read()).decode('utf-8')
                    
                if file_picker_context == "onboarding":
                    temp_avatar_b64 = b64_img
                    onboarding_avatar.content = ft.Image(src_base64=temp_avatar_b64, width=100, height=100, fit="cover", border_radius=50)
                elif file_picker_context == "profile":
                    temp_avatar_b64 = b64_img
                    profile_avatar.content = ft.Image(src_base64=temp_avatar_b64, width=80, height=80, fit="cover", border_radius=40)
                elif file_picker_context == "route":
                    wall_image.src_base64 = b64_img
                    image_placeholder.visible = False
                    markers_stack.visible = True
                    markers_stack.controls = [detector]
                page.update()
            except Exception: show_notify("Error loading image", is_error=True)

    global_file_picker = ft.FilePicker()
    page.overlay.append(global_file_picker)

    def trigger_picker(context):
        nonlocal file_picker_context
        file_picker_context = context
        global_file_picker.pick_files(on_result=on_file_picked)

    # ==========================================
    #        УТИЛИТЫ АВТОРИЗАЦИИ
    # ==========================================
    def hash_password(pwd):
        return hashlib.sha256(pwd.encode()).hexdigest()

    def safe_email(email):
        return email.lower().strip().replace('.', ',')

    # ==========================================
    #        НАВИГАЦИЯ (ГАМБУРГЕР И APPBAR)
    # ==========================================
    def toggle_theme(e):
        page.theme_mode = ft.ThemeMode.LIGHT if page.theme_mode == ft.ThemeMode.DARK else ft.ThemeMode.DARK
        e.control.icon = ft.icons.DARK_MODE if page.theme_mode == ft.ThemeMode.LIGHT else ft.icons.LIGHT_MODE
        page.update()

    def menu_changed(e):
        idx = e.control.selected_index
        if idx == 0: show_home_view()
        elif idx == 1: show_friends_view() 
        elif idx == 2: show_gyms_list_view()
        elif idx == 3: show_settings_view() 
        page.drawer.open = False
        page.update()

    def logout_click(e):
        page.client_storage.remove("user_profile")
        page.drawer.open = False 
        show_auth_view()

    page.drawer = ft.NavigationDrawer(
        on_change=menu_changed,
        controls=[
            ft.Container(height=20),
            ft.Text("   Navigation", size=20, weight="bold"),
            ft.Divider(),
            ft.NavigationDrawerDestination(label="Profile", icon=ft.icons.PERSON),
            ft.NavigationDrawerDestination(label="Friends", icon=ft.icons.PEOPLE), 
            ft.NavigationDrawerDestination(label="Climbing Gyms", icon=ft.icons.FITNESS_CENTER),
            ft.NavigationDrawerDestination(label="Settings", icon=ft.icons.SETTINGS),
            ft.Divider(),
            ft.Container(
                content=ft.Text("Log Out", color="red", weight="bold"),
                padding=15, ink=True, on_click=logout_click
            )
        ]
    )

    main_appbar = ft.AppBar(
        title=ft.Text("Spray Wall App", weight="bold"),
        bgcolor="#111111",
        actions=[ft.IconButton(ft.icons.LIGHT_MODE, on_click=toggle_theme)]
    )
    page.appbar = None 

    # ==========================================
    #        ЭКРАН 1: АВТОРИЗАЦИЯ
    # ==========================================
    auth_email = ft.TextField(label="Email", width=300)
    auth_password = ft.TextField(label="Password", width=300, password=True, can_reveal_password=True)
    is_login_mode = True 

    auth_title = ft.Text("Log In", size=32, weight="bold")
    auth_switch_btn = ft.Text("Don't have an account? Sign Up", color="blue", size=14)

    def switch_auth_mode(e):
        nonlocal is_login_mode
        is_login_mode = not is_login_mode
        auth_title.value = "Log In" if is_login_mode else "Sign Up"
        btn_auth_submit.content.value = "Login" if is_login_mode else "Create Account"
        auth_switch_btn.value = "Don't have an account? Sign Up" if is_login_mode else "Already have an account? Log In"
        page.update()

    def process_auth(e):
        em = auth_email.value.strip()
        pw = auth_password.value.strip()
        
        if em.lower() == "admin" and pw == "admin":
            p_data = get_profile_data()
            if not p_data.get("user_id"):
                p_data["user_id"] = str(uuid.uuid4())
            p_data["email"] = "admin@system.local"
            p_data["name"] = "Creator"
            p_data["first_name"] = "Global"
            p_data["last_name"] = "Admin"
            p_data["is_global_admin"] = True
            save_profile_data(p_data)
            show_home_view()
            show_notify("Welcome back, Boss!", is_error=False)
            return

        if not em or not pw:
            show_notify("Please fill all fields", is_error=True); return
        if "@" not in em:
            show_notify("Invalid email format", is_error=True); return

        s_email = safe_email(em)
        hashed_pw = hash_password(pw)
        
        if not is_login_mode:
            existing = fetch_data(f"auth_users/{s_email}")
            if existing:
                show_notify("Email already registered!", is_error=True); return
            
            new_uid = str(uuid.uuid4())
            save_data(f"auth_users/{s_email}", {"uid": new_uid, "password": hashed_pw})
            
            new_profile = {
                "user_id": new_uid, "email": em, "name": "", "first_name": "", 
                "last_name": "", "bio": "", "avatar_b64": "", "ascents_history": [],
                "is_global_admin": False
            }
            save_profile_data(new_profile)
            show_onboarding_view() 
            
        else: 
            user_creds = fetch_data(f"auth_users/{s_email}")
            if not user_creds or user_creds.get("password") != hashed_pw:
                show_notify("Wrong email or password!", is_error=True); return
            
            uid = user_creds["uid"]
            user_cloud_data = fetch_data(f"users/{uid}") or {}
            
            profile = {
                "user_id": uid, "email": em,
                "name": user_cloud_data.get("nickname", ""),
                "first_name": user_cloud_data.get("first_name", ""),
                "last_name": user_cloud_data.get("last_name", ""),
                "avatar_b64": user_cloud_data.get("avatar_b64", ""),
                "bio": user_cloud_data.get("bio", "Bouldering Enthusiast"),
                "ascents_history": fetch_data(f"user_ascents/{uid}") or [],
                "is_global_admin": False
            }
            save_profile_data(profile)
            
            if not profile["name"]: show_onboarding_view()
            else: show_home_view()

    btn_auth_submit = create_btn("Login", process_auth, width=300, height=50)
    auth_switch_container = ft.Container(content=auth_switch_btn, on_click=switch_auth_mode, ink=True, padding=10)

    login_view = ft.Column(horizontal_alignment=ft.CrossAxisAlignment.CENTER, visible=False, controls=[
        ft.Container(height=100), 
        auth_title, ft.Container(height=30), 
        auth_email, auth_password, ft.Container(height=10), 
        btn_auth_submit, auth_switch_container
    ])

    # ==========================================
    #        ЭКРАН 2: ONBOARDING
    # ==========================================
    onb_nickname = ft.TextField(label="Nickname *", width=250)
    onb_first_name = ft.TextField(label="First Name", width=250)
    onb_last_name = ft.TextField(label="Last Name", width=250)
    onb_bio = ft.TextField(label="About Me", width=250, multiline=True)
    
    onboarding_avatar = ft.Container(
        width=100, height=100, border_radius=50, bgcolor="#444444", 
        alignment=ft.Alignment(0, 0), content=ft.Icon(ft.icons.ADD_A_PHOTO, size=40, color="grey")
    )

    def complete_onboarding(e):
        if not onb_nickname.value.strip():
            show_notify("Nickname is required!", is_error=True); return
            
        p_data = get_profile_data()
        p_data["name"] = onb_nickname.value.strip()
        p_data["first_name"] = onb_first_name.value.strip()
        p_data["last_name"] = onb_last_name.value.strip()
        p_data["bio"] = onb_bio.value.strip() if onb_bio.value.strip() else "Bouldering Enthusiast"
        if temp_avatar_b64: p_data["avatar_b64"] = temp_avatar_b64
        
        save_profile_data(p_data)
        show_home_view()

    onboarding_view = ft.Column(horizontal_alignment=ft.CrossAxisAlignment.CENTER, visible=False, controls=[
        ft.Container(height=40),
        ft.Text("Welcome!", size=30, weight="bold"),
        ft.Text("Let's set up your profile", color="grey", size=14),
        ft.Container(height=20),
        onboarding_avatar,
        create_btn("Choose Avatar", lambda _: trigger_picker("onboarding"), bgcolor="#333333"),
        ft.Container(height=20),
        onb_nickname, onb_first_name, onb_last_name, onb_bio,
        ft.Container(height=10),
        create_btn("Let's Climb! 🚀", complete_onboarding, bgcolor="green", width=250, height=50)
    ])

    # ==========================================
    #        ЭКРАН 3: ПРОФИЛЬ (МОЙ)
    # ==========================================
    profile_avatar = ft.Container(width=80, height=80, border_radius=40, bgcolor="#444444", alignment=ft.Alignment(0, 0))

    profile_name = ft.Text("", size=24, weight="bold")
    profile_real_name = ft.Text("", color="grey", size=14)
    profile_bio = ft.Text("", color="grey", size=14)
    dev_badge = ft.Text("Global Admin", color="orange", weight="bold", visible=False) 

    edit_name_input = ft.TextField(label="Nickname", width=200, height=45)
    edit_first_name_input = ft.TextField(label="First Name", width=200, height=45)
    edit_last_name_input = ft.TextField(label="Last Name", width=200, height=45)
    edit_bio_input = ft.TextField(label="Status", width=200, height=45)

    def load_profile_ui():
        user_data = get_profile_data()
        avatar_b64 = user_data.get("avatar_b64", "")
        if avatar_b64: profile_avatar.content = ft.Image(src_base64=avatar_b64, width=80, height=80, fit="cover", border_radius=40)
        else: profile_avatar.content = ft.Text("No Img", size=14, color="white")
        
        profile_name.value = user_data.get("name", "")
        profile_real_name.value = f"{user_data.get('first_name','')} {user_data.get('last_name','')}".strip()
        profile_bio.value = user_data.get("bio", "")
        dev_badge.visible = user_data.get("is_global_admin", False)
        
        edit_name_input.value = user_data.get("name", "")
        edit_first_name_input.value = user_data.get("first_name", "")
        edit_last_name_input.value = user_data.get("last_name", "")
        edit_bio_input.value = user_data.get("bio", "")

    def save_profile_click(e):
        user_data = get_profile_data()
        user_data["name"] = edit_name_input.value
        user_data["first_name"] = edit_first_name_input.value
        user_data["last_name"] = edit_last_name_input.value
        user_data["bio"] = edit_bio_input.value
        if file_picker_context == "profile" and temp_avatar_b64: 
            user_data["avatar_b64"] = temp_avatar_b64 
            
        save_profile_data(user_data)
        load_profile_ui()
        profile_view_col.visible = True
        profile_edit_col.visible = False
        page.update()
        
    def cancel_profile_click(e):
        load_profile_ui()
        profile_view_col.visible = True
        profile_edit_col.visible = False
        page.update()

    profile_view_col = ft.Column([profile_name, profile_real_name, dev_badge, profile_bio, create_btn("Edit Profile", lambda e: setattr(profile_view_col, 'visible', False) or setattr(profile_edit_col, 'visible', True) or page.update(), bgcolor="#333333")], spacing=2)
    profile_edit_col = ft.Column([create_btn("Upload Photo", lambda _: trigger_picker("profile"), bgcolor="#444444"), edit_name_input, edit_first_name_input, edit_last_name_input, edit_bio_input, ft.Row([create_btn("Save", save_profile_click, bgcolor="green"), create_btn("Cancel", cancel_profile_click, bgcolor="red")])], visible=False, spacing=2)
    profile_header = ft.Row(alignment=ft.MainAxisAlignment.CENTER, controls=[profile_avatar, ft.Container(width=10), profile_view_col, profile_edit_col])
    
    # --- БЛОК ЗАЯВОК В ДРУЗЬЯ ---
    friend_requests_col = ft.Column(horizontal_alignment=ft.CrossAxisAlignment.STRETCH)
    friend_requests_container = ft.Container(
        content=ft.Column([ft.Text("Friend Requests", weight="bold", color="orange"), friend_requests_col]),
        visible=False, bgcolor="#222222", padding=10, border_radius=10
    )

    def handle_friend_request(sender_id, accept=True):
        my_id = get_profile_data()["user_id"]
        save_data(f"friend_requests/{my_id}/{sender_id}", None, method="DELETE")
        if accept:
            save_data(f"friends/{my_id}/{sender_id}", True)
            save_data(f"friends/{sender_id}/{my_id}", True)
            show_notify("Friend request accepted!")
        else:
            show_notify("Friend request declined.")
        update_friend_requests_ui()

    def update_friend_requests_ui():
        my_id = get_profile_data()["user_id"]
        reqs = fetch_data(f"friend_requests/{my_id}") or {}
        friend_requests_col.controls.clear()
        
        if not reqs:
            friend_requests_container.visible = False
        else:
            friend_requests_container.visible = True
            all_users = fetch_data("users") or {}
            for sender_id in reqs.keys():
                sender_data = all_users.get(sender_id, {})
                s_name = sender_data.get("nickname", "Unknown Climber")
                friend_requests_col.controls.append(
                    ft.Row([
                        ft.Text(f"@{s_name}", weight="bold", expand=True),
                        ft.IconButton(ft.icons.CHECK, icon_color="green", on_click=lambda e, sid=sender_id: handle_friend_request(sid, True)),
                        ft.IconButton(ft.icons.CLOSE, icon_color="red", on_click=lambda e, sid=sender_id: handle_friend_request(sid, False))
                    ], alignment=ft.MainAxisAlignment.SPACE_BETWEEN)
                )
        page.update()

    # СТАТИСТИКА ПРОФИЛЯ (МОЯ)
    stat_max_grade = ft.Text("-", size=24, weight="bold", color="red")
    stat_completed = ft.Text("0", size=24, weight="bold", color="green")
    stats_cards = ft.Row(alignment=ft.MainAxisAlignment.CENTER, controls=[
        ft.Card(content=ft.Container(width=150, padding=15, content=ft.Column([ft.Text("Max Grade", size=12, color="grey"), stat_max_grade], horizontal_alignment=ft.CrossAxisAlignment.CENTER))), 
        ft.Card(content=ft.Container(width=150, padding=15, content=ft.Column([ft.Text("Total Ascents", size=12, color="grey"), stat_completed], horizontal_alignment=ft.CrossAxisAlignment.CENTER)))
    ])

    grade_breakdown_label = ft.Text("No ascents yet", color="orange", weight="bold", size=16, text_align="center")
    days_of_week = ["M", "T", "W", "T", "F", "S", "S"]
    weekly_days_row = ft.Row(
        controls=[ft.Container(content=ft.Text(d, weight="bold", color="grey"), width=35, height=35, border_radius=5, alignment=ft.Alignment(0,0), bgcolor="#333333") for d in days_of_week], 
        alignment=ft.MainAxisAlignment.CENTER
    )

    stats_section = ft.Column(horizontal_alignment=ft.CrossAxisAlignment.CENTER, controls=[
        ft.Divider(height=20), stats_cards, ft.Container(height=10),
        ft.Text("Grade Breakdown", color="grey", size=12), grade_breakdown_label, ft.Container(height=15),
        ft.Text("Training This Week", color="grey", size=12), weekly_days_row
    ])

    home_view = ft.Column(visible=False, horizontal_alignment=ft.CrossAxisAlignment.CENTER, controls=[profile_header, friend_requests_container, stats_section])

    # ==========================================
    #        ЭКРАН 3.5: СПИСОК ДРУЗЕЙ 
    # ==========================================
    friends_list_col = ft.Column(horizontal_alignment=ft.CrossAxisAlignment.STRETCH)
    
    def build_friends_list():
        friends_list_col.controls.clear()
        my_id = get_profile_data()["user_id"]
        
        my_friends = fetch_data(f"friends/{my_id}") or {}
        all_users = fetch_data("users") or {}
        
        if not my_friends:
            friends_list_col.controls.append(ft.Text("You don't have any friends yet.\nGo to a Gym -> Climbers to find some!", color="grey", text_align="center"))
        else:
            for f_id in my_friends.keys():
                f_data = all_users.get(f_id)
                if not f_data: continue
                
                card = ft.Card(content=ft.Container(padding=15, ink=True, on_click=lambda e, u=f_id, d=f_data: open_other_profile(u, d, show_friends_view), content=ft.Row([
                    ft.Row([
                        ft.Image(src_base64=f_data.get('avatar_b64',''), width=40, height=40, border_radius=20) if f_data.get('avatar_b64') else ft.Container(width=40, height=40, border_radius=20, bgcolor="#444444", alignment=ft.Alignment(0,0), content=ft.Icon(ft.icons.PERSON)),
                        ft.Container(width=10),
                        ft.Column([
                            ft.Text(f"@{f_data.get('nickname','Unknown')}", weight="bold"),
                            ft.Text(f"{f_data.get('first_name','')} {f_data.get('last_name','')}", color="grey", size=12)
                        ], spacing=2)
                    ]),
                    ft.Text("Profile >", color="blue", size=12)
                ], alignment=ft.MainAxisAlignment.SPACE_BETWEEN)))
                friends_list_col.controls.append(card)
        page.update()

    friends_view = ft.Column(visible=False, horizontal_alignment=ft.CrossAxisAlignment.CENTER, controls=[
        ft.Text("My Friends", size=24, weight="bold"),
        friends_list_col
    ])

    # ==========================================
    #        ЭКРАН 3.9: SETTINGS (УДАЛЕНИЕ)
    # ==========================================
    def close_dialog(e):
        confirm_dialog.open = False
        page.update()

    def confirm_delete_account(e):
        p_data = get_profile_data()
        uid = p_data.get("user_id")
        email = p_data.get("email")
        
        # 1. Удаляем авторизацию
        if email:
            s_email = safe_email(email)
            save_data(f"auth_users/{s_email}", None, method="DELETE")
        
        # 2. Удаляем все личные данные из базы
        if uid:
            save_data(f"users/{uid}", None, method="DELETE")
            save_data(f"user_ascents/{uid}", None, method="DELETE")
            save_data(f"friends/{uid}", None, method="DELETE")
            save_data(f"friend_requests/{uid}", None, method="DELETE")
            
        # 3. Чистим память телефона и выходим
        page.client_storage.remove("user_profile")
        confirm_dialog.open = False
        show_auth_view()
        show_notify("Account permanently deleted.")

    confirm_dialog = ft.AlertDialog(
        title=ft.Text("Delete Account"),
        content=ft.Text("Are you sure? This action cannot be undone. All your profile data, ascents, and friends will be permanently deleted."),
        actions=[
            ft.TextButton("Cancel", on_click=close_dialog),
            ft.TextButton("Delete Everything", on_click=confirm_delete_account, style=ft.ButtonStyle(color="red")),
        ],
        actions_alignment=ft.MainAxisAlignment.END,
    )
    page.overlay.append(confirm_dialog)

    def open_delete_dialog(e):
        confirm_dialog.open = True
        page.update()

    settings_view = ft.Column(visible=False, horizontal_alignment=ft.CrossAxisAlignment.CENTER, controls=[
        ft.Container(height=40),
        ft.Text("Settings", size=24, weight="bold"),
        ft.Divider(),
        ft.Container(height=20),
        ft.Text("Danger Zone", color="red", weight="bold"),
        ft.Text("Once you delete your account, there is no going back.\nPlease be certain.", color="grey", size=12, text_align="center"),
        ft.Container(height=10),
        create_btn("Delete Account", open_delete_dialog, bgcolor="red"),
    ])

    # ==========================================
    #        ЭКРАН 4: СПИСОК ЗАЛОВ 
    # ==========================================
    gyms_list_col = ft.Column(horizontal_alignment=ft.CrossAxisAlignment.STRETCH)
    new_gym_name = ft.TextField(label="Gym Name (e.g. Gravity)")
    new_gym_city = ft.TextField(label="City")

    def toggle_create_gym(show):
        create_gym_panel.visible = show; page.update()

    def save_new_gym(e):
        if not new_gym_name.value: return
        show_notify("Creating your Gym in Cloud...")
        
        new_id = f"gym_{random.randint(100000,999999)}"
        gym_data = {"id": new_id, "name": new_gym_name.value, "city": new_gym_city.value}
        save_data(f"gyms/{new_id}", gym_data) 
        
        my_id = get_profile_data()["user_id"]
        save_data(f"gym_roles/{new_id}/{my_id}", "admin")
        
        new_gym_name.value = ""; new_gym_city.value = ""; toggle_create_gym(False); build_gyms_list(); page.update()

    create_gym_panel = ft.Container(
        content=ft.Column([
            ft.Text("Set Up New Gym", size=20, weight="bold"), new_gym_name, new_gym_city,
            ft.Row([create_btn("Cancel", lambda e: toggle_create_gym(False), bgcolor="red"), create_btn("Create", save_new_gym, bgcolor="green")])
        ]), bgcolor="#222222", padding=20, border_radius=10, visible=False
    )

    def on_gym_click(e, gym_data):
        nonlocal current_gym_id, current_gym_role
        current_gym_id = gym_data["id"]
        
        p_data = get_profile_data()
        my_id = p_data["user_id"]
        is_global = p_data.get("is_global_admin", False)
        
        if is_global:
            current_gym_role = "admin" 
        else:
            roles_in_gym = fetch_data(f"gym_roles/{current_gym_id}") or {}
            current_gym_role = roles_in_gym.get(my_id)
            if not current_gym_role:
                current_gym_role = "user"
                save_data(f"gym_roles/{current_gym_id}/{my_id}", "user")
            
        show_gym_routes_view()

    def build_gyms_list():
        gyms_list_col.controls.clear()
        p_data = get_profile_data()
        my_id = p_data["user_id"]
        is_global = p_data.get("is_global_admin", False)
        
        all_gyms = get_gyms_data() 
        
        if is_global:
            gyms_list_col.controls.append(ft.Text("Admin Tools (Global):", color="orange", size=12, text_align="center"))
            gyms_list_col.controls.append(create_btn("Create New Commercial Gym", lambda e: toggle_create_gym(True), bgcolor="orange"))
            gyms_list_col.controls.append(ft.Divider())

        if not all_gyms: 
            gyms_list_col.controls.append(ft.Text("No gyms found in the world yet.", color="grey", text_align="center"))
        else:
            gyms_list_col.controls.append(ft.Text("Explore Gyms Globally:", color="grey", size=12))

        for gym in reversed(all_gyms):
            if is_global:
                role_in_gym = "admin"
                color_role = "orange"
            else:
                role_in_gym = fetch_data(f"gym_roles/{gym['id']}/{my_id}") or "user"
                color_role = "orange" if role_in_gym == "admin" else ("blue" if role_in_gym == "setter" else "grey")

            gyms_list_col.controls.append(
                ft.Card(content=ft.Container(padding=20, ink=True, on_click=lambda e, g=gym: on_gym_click(e, g), content=ft.Row([
                    ft.Column([
                        ft.Text(gym["name"], size=18, weight="bold"), 
                        ft.Text(f"{gym.get('city', 'Unknown City')} | Role: {role_in_gym.capitalize()}", color=color_role, size=12)
                    ]),
                    ft.Text("Enter ->", size=14, color="blue", weight="bold")
                ], alignment=ft.MainAxisAlignment.SPACE_BETWEEN)))
            )

    gyms_list_view = ft.Column(visible=False, horizontal_alignment=ft.CrossAxisAlignment.CENTER, controls=[ft.Text("Climbing Gyms", size=24, weight="bold"), create_gym_panel, gyms_list_col])

    # ==========================================
    #        ЭКРАН 5: ТРАССЫ, ADMIN PANEL И CLIMBERS
    # ==========================================
    gallery_list = ft.Column(horizontal_alignment=ft.CrossAxisAlignment.STRETCH)
    
    # --- CLIMBERS (COMMUNITY) TAB ---
    community_list_col = ft.Column(horizontal_alignment=ft.CrossAxisAlignment.STRETCH)
    
    def load_community_panel():
        community_list_col.controls.clear()
        roles = fetch_data(f"gym_roles/{current_gym_id}") or {}
        all_users = fetch_data("users") or {}
        my_id = get_profile_data()["user_id"]
        
        community_list_col.controls.append(ft.Text("People climbing here:", color="grey", size=12, text_align="center"))
        
        for uid, role in roles.items():
            u_data = all_users.get(uid)
            if not u_data: continue
            
            role_badge = ""
            if role == "admin": role_badge = "👑 Admin"
            elif role == "setter": role_badge = "🛠️ Setter"
            
            card = ft.Card(content=ft.Container(padding=15, ink=True, on_click=lambda e, u=uid, d=u_data: open_other_profile(u, d, show_gym_routes_view), content=ft.Row([
                ft.Row([
                    ft.Image(src_base64=u_data.get('avatar_b64',''), width=40, height=40, border_radius=20) if u_data.get('avatar_b64') else ft.Container(width=40, height=40, border_radius=20, bgcolor="#444444", alignment=ft.Alignment(0,0), content=ft.Icon(ft.icons.PERSON)),
                    ft.Container(width=10),
                    ft.Column([
                        ft.Row([ft.Text(f"@{u_data.get('nickname','Unknown')}", weight="bold"), ft.Text(role_badge, color="orange", size=10)]),
                        ft.Text(f"{u_data.get('first_name','')} {u_data.get('last_name','')}", color="grey", size=12)
                    ], spacing=2)
                ]),
                ft.Text("Profile >", color="blue", size=12) if uid != my_id else ft.Text("(You)", color="green", size=12)
            ], alignment=ft.MainAxisAlignment.SPACE_BETWEEN)))
            
            if uid == my_id: community_list_col.controls.insert(1, card)
            else: community_list_col.controls.append(card)
        page.update()

    # --- ADMIN PANEL ---
    admin_search_input = ft.TextField(label="Search by Name or Email", expand=True, height=45)
    admin_search_results = ft.Column(horizontal_alignment=ft.CrossAxisAlignment.STRETCH)
    admin_current_staff = ft.Column(horizontal_alignment=ft.CrossAxisAlignment.STRETCH)

    def load_admin_panel():
        admin_current_staff.controls.clear()
        admin_search_results.controls.clear()
        admin_search_input.value = ""
        
        all_users = fetch_data("users") or {}
        roles = fetch_data(f"gym_roles/{current_gym_id}") or {}
        
        setters = [uid for uid, role in roles.items() if role == "setter"]
        if not setters:
            admin_current_staff.controls.append(ft.Text("No active setters yet.", color="grey", text_align="center"))
        else:
            for uid in setters:
                udata = all_users.get(uid, {})
                fn, ln, nn = udata.get("first_name", ""), udata.get("last_name", ""), udata.get("nickname", "Unknown")
                em = udata.get("email", "No Email")
                admin_current_staff.controls.append(
                    ft.Card(content=ft.Container(padding=10, content=ft.Row([
                        ft.Column([ft.Text(f"{fn} {ln}".strip() or "No Name", weight="bold"), ft.Text(f"@{nn} | {em}", size=12, color="grey")]),
                        create_btn("Remove", lambda e, u=uid: set_user_role(u, "user"), bgcolor="red")
                    ], alignment=ft.MainAxisAlignment.SPACE_BETWEEN)))
                )
        page.update()

    def do_admin_search(e):
        q = admin_search_input.value.lower().strip()
        admin_search_results.controls.clear()
        if not q: page.update(); return
            
        all_users = fetch_data("users") or {}
        roles = fetch_data(f"gym_roles/{current_gym_id}") or {}
        
        for uid, udata in all_users.items():
            if uid == get_profile_data()["user_id"]: continue 
            
            fn = udata.get("first_name", "").lower()
            ln = udata.get("last_name", "").lower()
            full = f"{fn} {ln}".strip()
            em = udata.get("email", "").lower()
            
            if q in fn or q in ln or q in full or q in em:
                role = roles.get(uid, "user")
                
                if role == "setter":
                    btn_text = "Demote"
                    btn_color = "red"
                    role_to_set = "user"
                else:
                    btn_text = "Make Setter"
                    btn_color = "green"
                    role_to_set = "setter"
                
                admin_search_results.controls.append(
                    ft.Card(content=ft.Container(padding=10, content=ft.Row([
                        ft.Column([ft.Text(f"{udata.get('first_name','')} {udata.get('last_name','')}", weight="bold"), ft.Text(f"@{udata.get('nickname','')} | {udata.get('email','')}", size=12, color="grey")]),
                        create_btn(btn_text, lambda e, u=uid, r=role_to_set: set_user_role(u, r), bgcolor=btn_color)
                    ], alignment=ft.MainAxisAlignment.SPACE_BETWEEN)))
                )
        page.update()

    def set_user_role(target_uid, new_role):
        save_data(f"gym_roles/{current_gym_id}/{target_uid}", new_role)
        show_notify(f"User is now a {new_role.upper()}!")
        do_admin_search(None) 
        load_admin_panel()    

    admin_panel_col = ft.Column(visible=False, horizontal_alignment=ft.CrossAxisAlignment.STRETCH, controls=[
        ft.Text("Current Setters", weight="bold", size=18), admin_current_staff, ft.Divider(),
        ft.Text("Find & Add Setters", weight="bold", size=18),
        ft.Row([admin_search_input, create_btn("Search", do_admin_search, bgcolor="blue")]),
        admin_search_results
    ])

    btn_add_route = create_btn("Add Route", lambda e: show_create_view(), bgcolor="green", visible=False)

    def handle_tab_change_custom(tab_name):
        nonlocal current_tab; current_tab = tab_name
        btn_tab_official.bgcolor = "blue" if current_tab == "official" else "#333333"
        btn_tab_custom.bgcolor = "blue" if current_tab == "custom" else "#333333"
        btn_tab_climbers.bgcolor = "blue" if current_tab == "climbers" else "#333333"
        btn_tab_admin.bgcolor = "blue" if current_tab == "admin" else "#333333"
        page.update(); load_gallery()

    btn_tab_official = create_btn("Official", lambda e: handle_tab_change_custom("official"), bgcolor="blue")
    btn_tab_custom = create_btn("Custom", lambda e: handle_tab_change_custom("custom"), bgcolor="#333333")
    btn_tab_climbers = create_btn("Climbers", lambda e: handle_tab_change_custom("climbers"), bgcolor="#333333")
    btn_tab_admin = create_btn("Admin Panel", lambda e: handle_tab_change_custom("admin"), bgcolor="#333333", visible=False)
    
    routes_tabs = ft.Row([btn_tab_official, btn_tab_custom, btn_tab_climbers, btn_tab_admin], alignment=ft.MainAxisAlignment.CENTER, scroll=ft.ScrollMode.AUTO)

    gym_routes_view = ft.Column(visible=False, horizontal_alignment=ft.CrossAxisAlignment.CENTER, controls=[
        btn_add_route, routes_tabs, ft.Divider(), gallery_list, admin_panel_col, community_list_col
    ])

    def load_gallery():
        nonlocal current_gym_role
        gallery_list.controls.clear() 
        gallery_list.visible = False
        admin_panel_col.visible = False
        community_list_col.visible = False
        btn_add_route.visible = False
        
        p_data = get_profile_data()
        my_id = p_data.get("user_id")
        is_global = p_data.get("is_global_admin", False)

        if is_global: current_gym_role = "admin"
        else:
            actual_role = fetch_data(f"gym_roles/{current_gym_id}/{my_id}")
            current_gym_role = actual_role if actual_role else "user"

        btn_tab_admin.visible = (current_gym_role == "admin") 
        
        if current_tab == "admin":
            admin_panel_col.visible = True
            load_admin_panel()
        elif current_tab == "climbers":
            community_list_col.visible = True
            load_community_panel()
        else:
            gallery_list.visible = True
            if current_tab == "official": btn_add_route.visible = (current_gym_role in ["admin", "setter"])
            else: btn_add_route.visible = True 
                
            boulders_data = fetch_data("boulders")
            if isinstance(boulders_data, dict): boulders = list(boulders_data.values())
            elif isinstance(boulders_data, list): boulders = [b for b in boulders_data if b is not None]
            else: boulders = []

            completed_ids = [a.get("boulder_id") for a in p_data.get("ascents_history", [])]
            
            filtered_boulders = [b for b in boulders if b.get("gym_id") == current_gym_id and b.get("route_type", "custom") == current_tab]

            if not filtered_boulders: gallery_list.controls.append(ft.Text(f"No {current_tab} routes here yet.", color="grey", text_align="center"))
            else:
                for b in reversed(filtered_boulders):
                    is_done = b.get("id") in completed_ids
                    card = ft.Container(on_click=lambda e, data=b: open_route(data), content=ft.Card(content=ft.Container(padding=15, content=ft.Column([
                        ft.Row([ft.Text(b["name"], weight="bold", size=18), ft.Text("Done" if is_done else "", color="green")], alignment=ft.MainAxisAlignment.SPACE_BETWEEN),
                        ft.Text(f"Grade: {sanitize_grade(b.get('grade', ''))} | By {b.get('author', 'Unknown')}", color="grey")
                    ]))))
                    gallery_list.controls.append(card)
        page.update()

    # ==========================================
    #        ЭКРАН 5.1: ЧУЖОЙ ПРОФИЛЬ (ПУБЛИЧНЫЙ)
    # ==========================================
    op_avatar = ft.Container(width=80, height=80, border_radius=40, bgcolor="#444444", alignment=ft.Alignment(0, 0))
    op_name = ft.Text("", size=24, weight="bold")
    op_real_name = ft.Text("", color="grey", size=14)
    op_bio = ft.Text("", color="grey", size=14)
    
    op_action_btn = create_btn("Add Friend", lambda e: handle_op_action())
    op_back_btn = create_btn("Back", lambda e: None, bgcolor="#333333") 
    
    op_stat_max = ft.Text("-", size=24, weight="bold", color="red")
    op_stat_total = ft.Text("0", size=24, weight="bold", color="green")
    
    op_private_lock = ft.Column([
        ft.Icon(ft.icons.LOCK, size=40, color="grey"),
        ft.Text("Detailed stats are hidden.\nAdd as friend to view.", color="grey", text_align="center")
    ], horizontal_alignment=ft.CrossAxisAlignment.CENTER, visible=True)
    
    op_grade_breakdown = ft.Text("", color="orange", weight="bold", size=16, text_align="center")
    op_weekly_days_row = ft.Row(
        controls=[ft.Container(content=ft.Text(d, weight="bold", color="grey"), width=35, height=35, border_radius=5, alignment=ft.Alignment(0,0), bgcolor="#333333") for d in ["M", "T", "W", "T", "F", "S", "S"]], 
        alignment=ft.MainAxisAlignment.CENTER
    )
    op_private_content = ft.Column([
        ft.Text("Grade Breakdown", color="grey", size=12), op_grade_breakdown, ft.Container(height=15),
        ft.Text("Training This Week", color="grey", size=12), op_weekly_days_row
    ], horizontal_alignment=ft.CrossAxisAlignment.CENTER, visible=False)

    def handle_op_action():
        my_id = get_profile_data()["user_id"]
        target_id = current_other_user_id
        current_state = op_action_btn.content.value
        
        if current_state == "Add Friend":
            save_data(f"friend_requests/{target_id}/{my_id}", True)
            show_notify("Friend Request Sent!")
        elif current_state == "Remove Friend":
            save_data(f"friends/{my_id}/{target_id}", None, method="DELETE")
            save_data(f"friends/{target_id}/{my_id}", None, method="DELETE")
            show_notify("Friend Removed.")
            
        refresh_op_view(target_id)

    def refresh_op_view(uid):
        my_id = get_profile_data()["user_id"]
        
        is_friend = fetch_data(f"friends/{my_id}/{uid}")
        sent_req = fetch_data(f"friend_requests/{uid}/{my_id}")
        received_req = fetch_data(f"friend_requests/{my_id}/{uid}")
        
        if is_friend:
            op_action_btn.content.value = "Remove Friend"
            op_action_btn.bgcolor = "red"
            op_private_lock.visible = False
            op_private_content.visible = True
        elif sent_req:
            op_action_btn.content.value = "Request Sent"
            op_action_btn.bgcolor = "grey"
            op_private_lock.visible = True
            op_private_content.visible = False
        elif received_req:
            op_action_btn.content.value = "Check Your Requests"
            op_action_btn.bgcolor = "orange"
            op_private_lock.visible = True
            op_private_content.visible = False
        else:
            op_action_btn.content.value = "Add Friend"
            op_action_btn.bgcolor = "blue"
            op_private_lock.visible = True
            op_private_content.visible = False
            
        page.update()

    def open_other_profile(uid, u_data, back_func):
        my_id = get_profile_data()["user_id"]
        if uid == my_id:
            show_home_view()
            return
            
        nonlocal current_other_user_id
        current_other_user_id = uid
        
        op_back_btn.on_click = lambda e: back_func()
        
        if u_data.get('avatar_b64'): op_avatar.content = ft.Image(src_base64=u_data['avatar_b64'], width=80, height=80, fit="cover", border_radius=40)
        else: op_avatar.content = ft.Text("No Img", size=14, color="white")
        
        op_name.value = f"@{u_data.get('nickname', 'Unknown')}"
        op_real_name.value = f"{u_data.get('first_name', '')} {u_data.get('last_name', '')}".strip()
        op_bio.value = u_data.get("bio", "Climber")
        
        history = fetch_data(f"user_ascents/{uid}") or []
        op_stat_total.value = str(len(history))
        
        grades = [a.get("grade") for a in history if a.get("grade") in ALL_GRADES]
        op_stat_max.value = max(grades, key=lambda x: ALL_GRADES.index(x)) if grades else "-"
        
        counts = Counter(a.get("grade") for a in history if a.get("grade"))
        if counts: op_grade_breakdown.value = " | ".join([f"{g}: {c}" for g, c in sorted(counts.items())])
        else: op_grade_breakdown.value = "No ascents yet"
            
        today = datetime.datetime.now()
        start_of_week = today - datetime.timedelta(days=today.weekday())
        start_of_week = start_of_week.replace(hour=0, minute=0, second=0, microsecond=0)
        
        active_days = set()
        for a in history:
            ts = a.get("timestamp", 0)
            if ts:
                dt = datetime.datetime.fromtimestamp(ts)
                if dt >= start_of_week: active_days.add(dt.weekday()) 
                    
        for i, day_container in enumerate(op_weekly_days_row.controls):
            if i in active_days: day_container.bgcolor = "green"; day_container.content.color = "white"
            else: day_container.bgcolor = "#333333"; day_container.content.color = "grey"
                
        refresh_op_view(uid)
        hide_all_views()
        other_profile_view.visible = True
        page.update()

    other_profile_view = ft.Column(visible=False, horizontal_alignment=ft.CrossAxisAlignment.CENTER, controls=[
        ft.Row([op_back_btn]),
        ft.Row([op_avatar, ft.Container(width=10), ft.Column([op_name, op_real_name, op_bio, op_action_btn])], alignment=ft.MainAxisAlignment.CENTER),
        ft.Divider(height=20),
        ft.Row([
            ft.Card(content=ft.Container(width=150, padding=15, content=ft.Column([ft.Text("Max Grade", size=12, color="grey"), op_stat_max], horizontal_alignment=ft.CrossAxisAlignment.CENTER))), 
            ft.Card(content=ft.Container(width=150, padding=15, content=ft.Column([ft.Text("Total Ascents", size=12, color="grey"), op_stat_total], horizontal_alignment=ft.CrossAxisAlignment.CENTER)))
        ], alignment=ft.MainAxisAlignment.CENTER),
        ft.Container(height=20),
        op_private_lock,
        op_private_content
    ])

    # ==========================================
    #        ЭКРАН 6: СОЗДАНИЕ ТРАССЫ
    # ==========================================
    boulder_name = ft.TextField(label="Name (optional)", width=200)
    boulder_grade = ft.TextField(label="Grade (e.g., 6B+) *", width=170)
    boulder_author = ft.TextField(label="Author", width=170)
    boulder_desc = ft.TextField(label="Description", width=300) 
    wall_image = ft.Image(src="", width=400, height=600, fit="contain")
    markers_stack = ft.Stack(width=400, height=600, visible=False)
    save_status = ft.Text(value="", size=14, weight="bold")
    color_info = ft.Text(value=f"Mode: Placing holds ({current_color})", size=14, color="grey")

    top_upload_zone = ft.Container(expand=True, ink=True, border_radius=10, on_click=lambda _: trigger_picker("route"), content=ft.Column([ft.Text("Gallery", size=24, weight="bold", color="grey"), ft.Text("Upload from device", color="grey")], alignment=ft.MainAxisAlignment.CENTER, horizontal_alignment=ft.CrossAxisAlignment.CENTER), alignment=ft.Alignment(0, 0))
    bottom_camera_zone = ft.Container(expand=True, ink=True, border_radius=10, on_click=lambda _: trigger_picker("route"), content=ft.Column([ft.Text("Camera", size=24, weight="bold", color="grey"), ft.Text("Take a photo", color="grey")], alignment=ft.MainAxisAlignment.CENTER, horizontal_alignment=ft.CrossAxisAlignment.CENTER), alignment=ft.Alignment(0, 0))
    image_placeholder = ft.Container(width=400, height=600, bgcolor="#222222", border_radius=10, content=ft.Column(controls=[top_upload_zone, ft.Divider(height=1, color="#444444"), bottom_camera_zone], spacing=0))

    def change_color(color_name): nonlocal current_color, is_delete_mode; is_delete_mode = False; current_color = color_name; color_info.value = f"Mode: Placing holds ({current_color})"; color_info.color = "grey"; page.update()
    def enable_delete_mode(e): nonlocal is_delete_mode; is_delete_mode = True; color_info.value = "Erase mode: Click a hold to remove it"; color_info.color = "red"; page.update()

    def on_image_tap(e):
        if is_delete_mode: return
        try: click_x, click_y = float(e.local_x), float(e.local_y)
        except: click_x, click_y = 100.0, 100.0
        def remove_marker(m):
            if is_delete_mode: markers_stack.controls.remove(m); page.update()
        
        marker = ft.Container(
            width=26, height=26, 
            border=ft.border.all(3, current_color), 
            bgcolor=ft.colors.TRANSPARENT, 
            border_radius=13, 
            left=click_x - 13, top=click_y - 13,
            data=current_color
        )
        marker.on_click = lambda ev, m=marker: remove_marker(m)
        markers_stack.controls.append(marker)
        page.update()

    detector = ft.GestureDetector(on_tap_down=on_image_tap, content=wall_image)
    markers_stack.controls = [detector]

    def save_boulder(e):
        if not boulder_grade.value or not wall_image.src_base64: return
        show_notify("Saving Route to Cloud...")

        new_id = str(uuid.uuid4())
        author_name = boulder_author.value if boulder_author.value else get_profile_data().get("name", "Unknown")
        
        boulder_data = {
            "id": new_id, 
            "name": boulder_name.value if boulder_name.value else "Untitled", 
            "grade": sanitize_grade(boulder_grade.value),
            "author": author_name, 
            "author_id": get_profile_data()["user_id"], 
            "description": boulder_desc.value, 
            "image_b64": wall_image.src_base64, 
            "markers": [{"x": m.left, "y": m.top, "color": m.data} for m in markers_stack.controls[1:] if m.data],
            "gym_id": current_gym_id, "route_type": current_tab         
        }
        save_data(f"boulders/{new_id}", boulder_data)

        boulder_name.value, boulder_grade.value, boulder_desc.value, wall_image.src_base64 = "", "", "", ""
        markers_stack.visible = False; image_placeholder.visible = True
        show_gym_routes_view() 

    color_buttons = ft.Row(alignment=ft.MainAxisAlignment.CENTER, controls=[create_btn("Start", lambda e: change_color("green"), bgcolor="green"), create_btn("Route", lambda e: change_color("blue"), bgcolor="blue"), create_btn("Top", lambda e: change_color("red"), bgcolor="red"), create_btn("Delete", enable_delete_mode, bgcolor="orange")])
    save_panel = ft.Column(horizontal_alignment=ft.CrossAxisAlignment.CENTER, controls=[ft.Row([boulder_name, boulder_grade, boulder_author], alignment=ft.MainAxisAlignment.CENTER), ft.Row([boulder_desc, create_btn("Save Route", save_boulder, bgcolor="purple", height=50)], alignment=ft.MainAxisAlignment.CENTER)])
    create_view = ft.Column(visible=False, horizontal_alignment=ft.CrossAxisAlignment.CENTER, controls=[ft.Row([create_btn("Back", lambda e: show_gym_routes_view(), bgcolor="#333333"), ft.Text("Create Route", size=24, weight="bold")]), save_panel, save_status, color_buttons, color_info, ft.Column([image_placeholder, markers_stack], horizontal_alignment=ft.CrossAxisAlignment.CENTER)])

    # ==========================================
    #        ЭКРАН 7: ПРОСМОТР И РЕДАКТИРОВАНИЕ ТРАССЫ
    # ==========================================
    view_title = ft.Text(value="", size=24, weight="bold")
    view_author_desc = ft.Text(value="", size=14, color="grey", italic=True)
    view_stack = ft.Stack(width=400, height=600)
    
    edit_name_field_route = ft.TextField(label="Name", width=150)
    edit_grade_dropdown_route = ft.Dropdown(label="Grade", options=[ft.dropdown.Option(g) for g in EDIT_GRADES], width=120)
    edit_author_field_route = ft.TextField(label="Author", width=150)
    edit_desc_field_route = ft.TextField(label="Description", width=300)

    def save_inline_edit_route(e):
        b_id = current_open_boulder_data.get("id")
        update_data = {
            "name": edit_name_field_route.value,
            "grade": edit_grade_dropdown_route.value,
            "author": edit_author_field_route.value,
            "description": edit_desc_field_route.value
        }
        if b_id: save_data(f"boulders/{b_id}", update_data, method="PATCH")
            
        current_open_boulder_data.update(update_data)
        view_title.value = f"{edit_name_field_route.value} ({edit_grade_dropdown_route.value})"
        view_author_desc.value = f"Author: {edit_author_field_route.value} | {edit_desc_field_route.value}"
        edit_panel_route.visible = False; view_title.visible = True; view_author_desc.visible = True; action_buttons_row.visible = True; page.update()

    def cancel_inline_edit_route(e): edit_panel_route.visible = False; view_title.visible = True; view_author_desc.visible = True; action_buttons_row.visible = True; page.update()
    edit_panel_route = ft.Column(visible=False, horizontal_alignment=ft.CrossAxisAlignment.CENTER, controls=[ft.Row([edit_name_field_route, edit_grade_dropdown_route, edit_author_field_route], alignment=ft.MainAxisAlignment.CENTER), ft.Row([edit_desc_field_route, create_btn("Save", save_inline_edit_route, bgcolor="green"), create_btn("Cancel", cancel_inline_edit_route, bgcolor="red")], alignment=ft.MainAxisAlignment.CENTER)])

    def activate_edit_mode_route(e):
        edit_name_field_route.value = current_open_boulder_data.get("name", "")
        edit_grade_dropdown_route.value = current_open_boulder_data.get("grade", "")
        edit_author_field_route.value = current_open_boulder_data.get("author", "")
        edit_desc_field_route.value = current_open_boulder_data.get("description", "")
        action_buttons_row.visible = False; view_title.visible = False; view_author_desc.visible = False; edit_panel_route.visible = True; page.update()

    def delete_current_route(e):
        b_id = current_open_boulder_data.get("id")
        if b_id: save_data(f"boulders/{b_id}", None, method="DELETE")
        show_gym_routes_view()

    def toggle_complete_route(e):
        p_data = get_profile_data()
        b_id = current_open_boulder_data.get("id")
        grade = current_open_boulder_data.get("grade")
        if not b_id: return
        
        history = p_data.get("ascents_history", [])
        is_comp = any(a.get("boulder_id") == b_id for a in history)
        
        if is_comp:
            p_data["ascents_history"] = [a for a in history if a.get("boulder_id") != b_id]
            btn_complete.content.value = "Mark Complete"
            btn_complete.bgcolor = "grey"
        else:
            p_data["ascents_history"].append({
                "boulder_id": b_id,
                "grade": grade,
                "timestamp": time.time()
            })
            btn_complete.content.value = "Completed"
            btn_complete.bgcolor = "green"
        
        save_profile_data(p_data)
        save_data(f"user_ascents/{p_data['user_id']}", p_data["ascents_history"])
        page.update()

    btn_back_r = create_btn("Back", lambda e: show_gym_routes_view(), bgcolor="#333333")
    btn_complete = create_btn("Mark Complete", toggle_complete_route, bgcolor="grey")
    btn_edit = create_btn("Edit", activate_edit_mode_route, bgcolor="blue")
    btn_delete = create_btn("Delete", delete_current_route, bgcolor="red")

    action_buttons_row = ft.Row([btn_back_r, btn_edit, btn_complete, btn_delete], alignment=ft.MainAxisAlignment.CENTER)
    route_view = ft.Column(visible=False, horizontal_alignment=ft.CrossAxisAlignment.CENTER, controls=[action_buttons_row, edit_panel_route, view_title, view_author_desc, view_stack])

    def open_route(boulder_data):
        nonlocal current_open_boulder_data
        current_open_boulder_data = boulder_data
        
        view_title.value = f"{boulder_data['name']} ({boulder_data.get('grade', '')})"
        view_author_desc.value = f"By {boulder_data.get('author', 'Unknown')} | {boulder_data.get('description', '')}"
        
        my_id = get_profile_data().get("user_id")
        completed_ids = [a.get("boulder_id") for a in get_profile_data().get("ascents_history", [])]
        is_c = boulder_data.get("id") in completed_ids
        
        btn_complete.content.value = "Completed" if is_c else "Mark Complete"
        btn_complete.bgcolor = "green" if is_c else "grey"

        author_id = boulder_data.get("author_id", "")
        if current_tab == "official":
            if current_gym_role in ["admin", "setter"]: btn_edit.visible = True; btn_delete.visible = True
            else: btn_edit.visible = False; btn_delete.visible = False
        else: 
            if my_id == author_id or current_gym_role == "admin": btn_edit.visible = True; btn_delete.visible = True
            else: btn_edit.visible = False; btn_delete.visible = False

        view_image = ft.Image(width=400, height=600, fit="contain")
        if boulder_data.get("image_b64"): view_image.src_base64 = boulder_data["image_b64"]

        view_stack.controls.clear()
        view_stack.controls.append(view_image)
        view_stack.controls.append(ft.Container(width=400, height=600, bgcolor=ft.colors.with_opacity(0.4, "black")))
        
        for m in boulder_data.get("markers", []): 
            marker_color = m.get("color", "blue") 
            view_stack.controls.append(ft.Container(
                width=26, height=26, 
                border=ft.border.all(3, marker_color), 
                bgcolor=ft.colors.TRANSPARENT, 
                border_radius=13, 
                left=m.get("x", 0), top=m.get("y", 0)
            ))
            
        hide_all_views()
        page.appbar = main_appbar 
        route_view.visible = True
        page.update()

    # ==========================================
    #        РАСЧЕТ СТАТИСТИКИ ПРОФИЛЯ
    # ==========================================
    def update_profile_stats():
        p_data = get_profile_data()
        history = p_data.get("ascents_history", [])
        
        stat_completed.value = str(len(history))
        
        grades = [a.get("grade") for a in history if a.get("grade") in ALL_GRADES]
        stat_max_grade.value = max(grades, key=lambda x: ALL_GRADES.index(x)) if grades else "-"
        
        counts = Counter(a.get("grade") for a in history if a.get("grade"))
        if counts: grade_breakdown_label.value = " | ".join([f"{g}: {c}" for g, c in sorted(counts.items())])
        else: grade_breakdown_label.value = "No ascents yet"
            
        today = datetime.datetime.now()
        start_of_week = today - datetime.timedelta(days=today.weekday())
        start_of_week = start_of_week.replace(hour=0, minute=0, second=0, microsecond=0)
        
        active_days = set()
        for a in history:
            ts = a.get("timestamp", 0)
            if ts:
                dt = datetime.datetime.fromtimestamp(ts)
                if dt >= start_of_week: active_days.add(dt.weekday()) 
                    
        for i, day_container in enumerate(weekly_days_row.controls):
            if i in active_days:
                day_container.bgcolor = "green"
                day_container.content.color = "white"
            else:
                day_container.bgcolor = "#333333"
                day_container.content.color = "grey"
                
        page.update()

    def hide_all_views():
        home_view.visible = False
        friends_view.visible = False
        gyms_list_view.visible = False
        gym_routes_view.visible = False
        create_view.visible = False
        route_view.visible = False
        login_view.visible = False
        onboarding_view.visible = False
        other_profile_view.visible = False
        settings_view.visible = False

    def show_auth_view():
        hide_all_views()
        page.appbar = None 
        login_view.visible = True
        page.update()

    def show_onboarding_view():
        hide_all_views()
        page.appbar = None 
        onboarding_view.visible = True
        page.update()

    def show_home_view():
        hide_all_views()
        page.appbar = main_appbar 
        if page.drawer: page.drawer.selected_index = 0
        load_profile_ui()
        update_friend_requests_ui()
        home_view.visible = True
        update_profile_stats()
        page.update()
        
    def show_friends_view():
        hide_all_views()
        page.appbar = main_appbar 
        if page.drawer: page.drawer.selected_index = 1
        build_friends_list()
        friends_view.visible = True
        page.update()

    def show_gyms_list_view():
        hide_all_views()
        page.appbar = main_appbar
        if page.drawer: page.drawer.selected_index = 2
        build_gyms_list()
        gyms_list_view.visible = True
        page.update()

    def show_gym_routes_view():
        hide_all_views()
        page.appbar = main_appbar
        if page.drawer: page.drawer.selected_index = 2
        gym_routes_view.visible = True
        load_gallery()
        page.update()

    def show_settings_view():
        hide_all_views()
        page.appbar = main_appbar
        if page.drawer: page.drawer.selected_index = 3
        settings_view.visible = True
        page.update()

    def show_create_view():
        hide_all_views()
        page.appbar = main_appbar
        create_view.visible = True
        page.update()

    page.add(notify_box, login_view, onboarding_view, home_view, friends_view, gyms_list_view, gym_routes_view, create_view, route_view, other_profile_view, settings_view)

    # ЛОГИКА АВТОВХОДА 
    saved_user = get_profile_data()
    if saved_user.get("user_id") and saved_user.get("name"):
        show_home_view()
    else:
        show_auth_view() 

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    ft.app(target=main, host="0.0.0.0", port=port)