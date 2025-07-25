from flask import Blueprint, request, jsonify, session
from datetime import datetime
from src.models.tronos_models import db, TronosUser, RemovalRequest, ContactMessage, SystemLog

tronos_bp = Blueprint('tronos', __name__)

def log_action(user_id, action, details=None):
    """Função para registrar logs do sistema"""
    try:
        log = SystemLog(
            user_id=user_id,
            action=action,
            details=details,
            ip_address=request.remote_addr
        )
        
        db.session.add(log)
        
        # Usar flush ao invés de commit para evitar transações aninhadas
        db.session.flush()
        
    except Exception as e:
        # Se houver erro no log, não deve afetar a operação principal
        print(f"Erro ao registrar log: {str(e)}")
        db.session.rollback()

@tronos_bp.route('/register', methods=['POST'])
def register():
    """Registro de novos usuários"""
    try:
        data = request.get_json()
        
        # Para criadores, usar email como login
        if data['user_type'] == 'creator':
            login_field = data['email']
        else:
            login_field = data['login']
        
        # Verificar se login já existe
        if TronosUser.query.filter_by(login=login_field).first():
            return jsonify({'error': 'Login/E-mail já existe'}), 400
        
        # Verificar se email já existe
        if TronosUser.query.filter_by(email=data['email']).first():
            return jsonify({'error': 'E-mail já cadastrado'}), 400
        
        # Criar novo usuário
        user = TronosUser(
            login=login_field,
            full_name=data['full_name'],
            email=data['email'],
            birth_date=datetime.strptime(data['birth_date'], '%Y-%m-%d').date(),
            user_type=data['user_type']
        )
        
        # Para criadores, usar phone ao invés de whatsapp
        if data['user_type'] == 'creator':
            user.whatsapp = data.get('phone', '')
        else:
            user.whatsapp = data.get('whatsapp', '')
        
        user.set_password(data['password'])
        
        # Campos específicos para agentes
        if data['user_type'] == 'agent':
            user.channel_name = data.get('channel_name')
            user.function = data.get('function')
            user.function_other = data.get('function_other')
            user.represented_creator = data.get('represented_creator')
            user.registration_code = data.get('registration_code')
        
        # Campos específicos para criadores
        elif data['user_type'] == 'creator':
            user.channel_name = data.get('channel_name')
            user.channel_description = data.get('channel_description')
            user.main_platforms = data.get('main_platforms')
            user.subscribers_count = data.get('subscribers_count')
            
            # Novos campos obrigatórios para criadores
            user.full_address = data.get('full_address')
            user.phone = data.get('phone')
            user.social_url = data.get('social_url')
            user.country = data.get('country')
            user.document_number = data.get('document_number')
            user.signature = data.get('signature')
            
            # Declarações obrigatórias
            user.declaration_1 = data.get('declaration_1', False)
            user.declaration_2 = data.get('declaration_2', False)
            user.declaration_3 = data.get('declaration_3', False)
            user.declaration_4 = data.get('declaration_4', False)
            user.declaration_5 = data.get('declaration_5', False)
            user.declaration_6 = data.get('declaration_6', False)
            user.declaration_7 = data.get('declaration_7', False)
            user.declaration_8 = data.get('declaration_8', False)
            user.declaration_9 = data.get('declaration_9', False)
            
            # Verificar se todas as declarações foram aceitas
            declarations = [
                user.declaration_1, user.declaration_2, user.declaration_3,
                user.declaration_4, user.declaration_5, user.declaration_6,
                user.declaration_7, user.declaration_8, user.declaration_9
            ]
            
            if not all(declarations):
                return jsonify({'error': 'Todas as declarações obrigatórias devem ser aceitas'}), 400
        
        db.session.add(user)
        db.session.commit()
        
        log_action(user.id, f'Cadastro de {user.user_type}', f'Usuário {user.login} se cadastrou')
        
        return jsonify({'message': 'Cadastro realizado com sucesso! Aguarde aprovação.'}), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@tronos_bp.route('/login', methods=['POST'])
def login():
    """Login de usuários usando email"""
    try:
        data = request.get_json()
        # Buscar usuário por email ao invés de login
        user = TronosUser.query.filter_by(email=data['login']).first()
        
        if user and user.check_password(data['password']):
            if not user.is_approved:
                return jsonify({'error': 'Usuário aguardando aprovação'}), 401
            
            session['user_id'] = user.id
            session['user_type'] = user.user_type
            
            log_action(user.id, 'Login', f'Usuário {user.email} fez login')
            
            # Determinar URL de redirecionamento
            redirect_url = get_redirect_url(user.user_type)
            
            return jsonify({
                'message': 'Login realizado com sucesso',
                'redirect': redirect_url,
                'user': {
                    'id': user.id,
                    'full_name': user.full_name,
                    'email': user.email,
                    'user_type': user.user_type,
                    'is_approved': user.is_approved
                }
            }), 200
        else:
            return jsonify({'error': 'Email ou senha incorretos'}), 401
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def get_redirect_url(user_type):
    """Obter URL de redirecionamento baseada no tipo de usuário"""
    if user_type == 'admin':
        return '/admin'
    else:
        return '/panel'

@tronos_bp.route('/logout', methods=['POST'])
def logout():
    """Logout de usuários"""
    user_id = session.get('user_id')
    if user_id:
        log_action(user_id, 'Logout', 'Usuário fez logout')
    
    session.clear()
    return jsonify({'message': 'Logout realizado com sucesso'}), 200

@tronos_bp.route('/contact', methods=['POST'])
def contact():
    """Formulário de contato"""
    try:
        data = request.get_json()
        
        message = ContactMessage(
            name=data['name'],
            email=data['email'],
            whatsapp=data['whatsapp'],
            video_url=data['video_url'],
            message=data['message']
        )
        
        db.session.add(message)
        db.session.commit()
        
        return jsonify({'message': 'Mensagem enviada com sucesso!'}), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@tronos_bp.route('/admin/contact-messages', methods=['GET'])
def get_contact_messages():
    """Listar mensagens de contato (apenas admin)"""
    try:
        if session.get('user_type') != 'admin':
            return jsonify({'error': 'Acesso negado'}), 403
        
        messages = ContactMessage.query.order_by(ContactMessage.created_at.desc()).all()
        
        return jsonify([{
            'id': msg.id,
            'name': msg.name,
            'email': msg.email,
            'whatsapp': msg.whatsapp,
            'video_url': msg.video_url,
            'message': msg.message,
            'created_at': msg.created_at.isoformat(),
            'is_read': msg.is_read
        } for msg in messages]), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@tronos_bp.route('/admin/contact-messages/<int:message_id>/read', methods=['POST'])
def mark_contact_read(message_id):
    """Marcar mensagem como lida (apenas admin)"""
    try:
        if session.get('user_type') != 'admin':
            return jsonify({'error': 'Acesso negado'}), 403
        
        message = ContactMessage.query.get_or_404(message_id)
        message.is_read = True
        db.session.commit()
        
        log_action(session['user_id'], 'Mensagem lida', f'Mensagem de {message.name} marcada como lida')
        
        return jsonify({'message': 'Mensagem marcada como lida'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@tronos_bp.route('/search', methods=['GET'])
def search():
    """Busca de conteúdos removidos"""
    try:
        url = request.args.get('url')
        if not url:
            return jsonify({'error': 'URL é obrigatória'}), 400
        
        # Normalizar URL removendo espaços e convertendo para minúsculo
        url = url.strip().lower()
        
        # Buscar solicitações de remoção aprovadas com URL exata ou muito similar
        # Usar busca exata primeiro, depois busca por padrões específicos
        requests = RemovalRequest.query.filter(
            RemovalRequest.status == 'approved'
        ).all()
        
        # Filtrar manualmente para busca mais precisa
        matching_requests = []
        for req in requests:
            removal_url_normalized = req.removal_url.strip().lower()
            
            # Busca exata
            if removal_url_normalized == url:
                matching_requests.append(req)
                continue
            
            # Busca por URL completa do YouTube (deve ter watch?v= e ID específico)
            if 'youtube.com/watch' in url and 'v=' in url:
                # Extrair ID do vídeo da URL pesquisada
                if 'v=' in url:
                    try:
                        video_id = url.split('v=')[1].split('&')[0]
                        # Verificar se a URL salva contém o mesmo ID de vídeo
                        if f'v={video_id}' in removal_url_normalized:
                            matching_requests.append(req)
                            continue
                    except:
                        pass
            
            # Busca por URL completa do TikTok (deve ter usuário e ID específico)
            elif 'tiktok.com' in url and '/video/' in url:
                try:
                    # Extrair ID do vídeo do TikTok
                    video_id = url.split('/video/')[1].split('?')[0].split('/')[0]
                    if f'/video/{video_id}' in removal_url_normalized:
                        matching_requests.append(req)
                        continue
                except:
                    pass
            
            # Para outras plataformas, busca mais restritiva
            elif len(url) > 20:  # URLs muito curtas não devem retornar resultados
                # Só retorna se a URL pesquisada for pelo menos 80% da URL salva
                if len(url) >= len(removal_url_normalized) * 0.8:
                    if url in removal_url_normalized:
                        matching_requests.append(req)
        
        if matching_requests:
            results = []
            for req in matching_requests:
                results.append({
                    'video_url': req.removal_url,
                    'reason': 'Remoção por direitos autorais',
                    'date': req.updated_at.strftime('%d/%m/%Y'),
                    'original_title': req.original_title
                })
            return jsonify({'found': True, 'results': results}), 200
        else:
            return jsonify({
                'found': False, 
                'message': 'Nenhuma remoção encontrada para esta URL'
            }), 200
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@tronos_bp.route('/removal-request', methods=['POST'])
def create_removal_request():
    """Criar solicitação de remoção (apenas usuários logados)"""
    try:
        if 'user_id' not in session:
            return jsonify({'error': 'Usuário não autenticado'}), 401
        
        data = request.get_json()
        items = data.get('items', [])
        
        if not items:
            return jsonify({'error': 'Nenhum item fornecido'}), 400
        
        created_requests = []
        
        for item in items:
            request_obj = RemovalRequest(
                user_id=session['user_id'],
                original_url=item['originalUrl'],
                original_title=item['originalTitle'],
                original_date=datetime.strptime(item['uploadDate'], '%Y-%m-%d').date(),
                removal_url=item['removalUrl'],
                username=item['userName']
            )
            
            db.session.add(request_obj)
            created_requests.append(request_obj)
        
        db.session.commit()
        
        log_action(session['user_id'], 'Solicitação de remoção', f'{len(created_requests)} solicitações criadas')
        
        return jsonify({
            'message': f'{len(created_requests)} solicitação(ões) enviada(s) com sucesso!',
            'count': len(created_requests)
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@tronos_bp.route('/my-requests', methods=['GET'])
def get_my_requests():
    """Listar solicitações do usuário logado"""
    try:
        if 'user_id' not in session:
            return jsonify({'error': 'Usuário não autenticado'}), 401
        
        requests = RemovalRequest.query.filter_by(user_id=session['user_id']).order_by(RemovalRequest.created_at.desc()).all()
        
        return jsonify([req.to_dict() for req in requests]), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Rotas administrativas
@tronos_bp.route('/admin/pending-users', methods=['GET'])
def get_pending_users():
    """Listar usuários pendentes de aprovação (apenas admin)"""
    try:
        if session.get('user_type') != 'admin':
            return jsonify({'error': 'Acesso negado'}), 403
        
        users = TronosUser.query.filter_by(is_approved=False).order_by(TronosUser.created_at.desc()).all()
        
        return jsonify([user.to_dict() for user in users]), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@tronos_bp.route('/admin/approve-user/<int:user_id>', methods=['POST'])
def approve_user(user_id):
    """Aprovar usuário (apenas admin)"""
    try:
        if session.get('user_type') != 'admin':
            return jsonify({'error': 'Acesso negado'}), 403
        
        user = TronosUser.query.get_or_404(user_id)
        user.is_approved = True
        db.session.commit()
        
        log_action(session['user_id'], 'Aprovação de usuário', f'Usuário {user.login} foi aprovado')
        
        return jsonify({'message': 'Usuário aprovado com sucesso!'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@tronos_bp.route('/admin/reject-user/<int:user_id>', methods=['POST'])
def reject_user(user_id):
    """Rejeitar usuário (apenas admin)"""
    try:
        if session.get('user_type') != 'admin':
            return jsonify({'error': 'Acesso negado'}), 403
        
        user = TronosUser.query.get_or_404(user_id)
        db.session.delete(user)
        db.session.commit()
        
        log_action(session['user_id'], 'Rejeição de usuário', f'Usuário {user.login} foi rejeitado')
        
        return jsonify({'message': 'Usuário rejeitado!'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@tronos_bp.route('/admin/removal-requests', methods=['GET'])
def get_all_removal_requests():
    """Listar todas as solicitações de remoção (apenas admin)"""
    try:
        if session.get('user_type') != 'admin':
            return jsonify({'error': 'Acesso negado'}), 403
        
        # Fazer JOIN com a tabela de usuários para obter informações completas
        requests = db.session.query(RemovalRequest, TronosUser).join(
            TronosUser, RemovalRequest.user_id == TronosUser.id
        ).order_by(RemovalRequest.created_at.desc()).all()
        
        result = []
        for req, user in requests:
            req_dict = req.to_dict()
            # Adicionar informações do usuário
            req_dict['requester_name'] = user.full_name
            req_dict['requester_email'] = user.email
            req_dict['requester_type'] = user.user_type
            req_dict['requester_login'] = user.login
            result.append(req_dict)
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@tronos_bp.route('/admin/update-request/<int:request_id>', methods=['POST'])
def update_removal_request(request_id):
    """Atualizar status de solicitação de remoção (apenas admin)"""
    try:
        if session.get('user_type') != 'admin':
            return jsonify({'error': 'Acesso negado'}), 403
        
        data = request.get_json()
        
        # Buscar a solicitação
        req = RemovalRequest.query.get(request_id)
        if not req:
            return jsonify({'error': 'Solicitação não encontrada'}), 404
        
        # Atualizar os campos
        req.status = data.get('status', req.status)
        req.admin_notes = data.get('admin_notes', '')
        req.updated_at = datetime.utcnow()
        
        # Criar log na mesma transação
        log = SystemLog(
            user_id=session['user_id'],
            action='Atualização de solicitação',
            details=f'Solicitação {request_id} atualizada para {req.status}',
            ip_address=request.remote_addr
        )
        db.session.add(log)
        
        # Commit único para ambas as operações
        try:
            db.session.commit()
            return jsonify({'message': 'Solicitação atualizada com sucesso!'}), 200
            
        except Exception as commit_error:
            db.session.rollback()
            return jsonify({'error': f'Erro ao salvar no banco de dados: {str(commit_error)}'}), 500
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500

@tronos_bp.route('/check-auth', methods=['GET'])
def check_auth():
    """Verificar status de autenticação"""
    try:
        if 'user_id' in session:
            user = TronosUser.query.get(session['user_id'])
            if user and user.is_approved:
                return jsonify({
                    'authenticated': True,
                    'user': user.to_dict()
                }), 200
        
        return jsonify({'authenticated': False}), 200
    except Exception as e:
        return jsonify({'authenticated': False}), 200

@tronos_bp.route('/admin/logs', methods=['GET'])
def get_logs():
    """Listar logs do sistema (apenas admin)"""
    try:
        if session.get('user_type') != 'admin':
            return jsonify({'error': 'Acesso negado'}), 403
        
        logs = SystemLog.query.order_by(SystemLog.created_at.desc()).limit(100).all()
        
        return jsonify([log.to_dict() for log in logs]), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@tronos_bp.route('/admin/all-users', methods=['GET'])
def get_all_users():
    """Listar todos os usuários (apenas admin)"""
    try:
        if session.get('user_type') != 'admin':
            return jsonify({'error': 'Acesso negado'}), 403
        
        # Buscar todos os usuários (aprovados e pendentes)
        users = TronosUser.query.all()
        
        users_data = []
        for user in users:
            user_dict = user.to_dict()
            # Adicionar informações extras para o admin
            user_dict['status_text'] = 'Aprovado' if user.is_approved else 'Pendente'
            user_dict['type_text'] = {
                'admin': 'Administrador',
                'agent': 'Agente',
                'creator': 'Criador'
            }.get(user.user_type, user.user_type)
            users_data.append(user_dict)
        
        return jsonify(users_data), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@tronos_bp.route('/admin/users/<int:user_id>/revoke', methods=['POST'])
def revoke_user_access(user_id):
    """Revogar acesso de um usuário (apenas admin)"""
    try:
        if session.get('user_type') != 'admin':
            return jsonify({'error': 'Acesso negado'}), 403
        
        user = TronosUser.query.get(user_id)
        if not user:
            return jsonify({'error': 'Usuário não encontrado'}), 404
        
        # Revogar aprovação
        user.is_approved = False
        db.session.commit()
        
        log_action(session.get('user_id'), 'Revogação de acesso', f'Acesso revogado para usuário {user.login}')
        
        return jsonify({'message': 'Acesso revogado com sucesso'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@tronos_bp.route('/create-test-user', methods=['POST'])
def create_test_user():
    """Criar usuário de teste (apenas para desenvolvimento)"""
    try:
        # Verificar se usuário já existe
        existing_user = TronosUser.query.filter_by(login='agente_teste').first()
        if existing_user:
            return jsonify({'message': 'Usuário de teste já existe'}), 200
        
        # Criar usuário agente de teste
        test_user = TronosUser(
            login='agente_teste',
            email='agente@teste.com',
            full_name='Agente de Teste',
            user_type='agent',
            channel_name='Canal Teste',
            function='Editor principal',
            whatsapp='11999999999',
            birth_date='1990-01-01',
            registration_code='TESTE123',
            represented_creator='Criador Teste',
            is_approved=True  # Já aprovado para teste
        )
        
        test_user.set_password('teste123')
        
        db.session.add(test_user)
        db.session.commit()
        
        return jsonify({
            'message': 'Usuário de teste criado com sucesso!',
            'login': 'agente_teste',
            'password': 'teste123'
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500



# ==================== ROTAS DE GERENCIAMENTO DE USUÁRIOS ====================

@tronos_bp.route('/admin/users/<int:user_id>', methods=['GET'])
def get_user_details(user_id):
    """Obter detalhes completos de um usuário (apenas admin)"""
    try:
        if session.get('user_type') != 'admin':
            return jsonify({'error': 'Acesso negado'}), 403
        
        user = TronosUser.query.get_or_404(user_id)
        
        # Retornar todos os dados do usuário, incluindo senha (hash)
        user_data = user.to_dict()
        user_data['password_hash'] = user.password_hash  # Para visualização admin
        
        log_action(session['user_id'], 'Visualização de usuário', f'Visualizou dados do usuário {user.login}')
        
        return jsonify(user_data), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@tronos_bp.route('/admin/users/<int:user_id>/password', methods=['POST'])
def reset_user_password(user_id):
    """Redefinir senha de um usuário (apenas admin)"""
    try:
        if session.get('user_type') != 'admin':
            return jsonify({'error': 'Acesso negado'}), 403
        
        data = request.get_json()
        new_password = data.get('new_password')
        
        if not new_password or len(new_password) < 6:
            return jsonify({'error': 'Senha deve ter pelo menos 6 caracteres'}), 400
        
        user = TronosUser.query.get_or_404(user_id)
        user.set_password(new_password)
        
        db.session.commit()
        
        log_action(session['user_id'], 'Redefinição de senha', f'Senha redefinida para usuário {user.login}')
        
        return jsonify({
            'message': 'Senha redefinida com sucesso',
            'new_password': new_password  # Retornar para o admin ver
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@tronos_bp.route('/admin/users/<int:user_id>/edit', methods=['POST'])
def edit_user(user_id):
    """Editar informações completas de um usuário (apenas admin)"""
    try:
        if session.get('user_type') != 'admin':
            return jsonify({'error': 'Acesso negado'}), 403
        
        data = request.get_json()
        user = TronosUser.query.get_or_404(user_id)
        
        # Campos básicos que podem ser editados
        if 'full_name' in data:
            user.full_name = data['full_name']
        if 'email' in data:
            # Verificar se email já existe em outro usuário
            existing_user = TronosUser.query.filter(
                TronosUser.email == data['email'],
                TronosUser.id != user_id
            ).first()
            if existing_user:
                return jsonify({'error': 'E-mail já está em uso por outro usuário'}), 400
            user.email = data['email']
        if 'whatsapp' in data:
            user.whatsapp = data['whatsapp']
        if 'birth_date' in data:
            user.birth_date = datetime.strptime(data['birth_date'], '%Y-%m-%d').date()
        if 'is_approved' in data:
            user.is_approved = data['is_approved']
        
        # Campos específicos para agentes
        if user.user_type == 'agent':
            if 'channel_name' in data:
                user.channel_name = data['channel_name']
            if 'function' in data:
                user.function = data['function']
            if 'function_other' in data:
                user.function_other = data['function_other']
            if 'represented_creator' in data:
                user.represented_creator = data['represented_creator']
            if 'registration_code' in data:
                user.registration_code = data['registration_code']
        
        # Campos específicos para criadores
        elif user.user_type == 'creator':
            if 'channel_name' in data:
                user.channel_name = data['channel_name']
            if 'channel_description' in data:
                user.channel_description = data['channel_description']
            if 'main_platforms' in data:
                user.main_platforms = data['main_platforms']
            if 'subscribers_count' in data:
                user.subscribers_count = data['subscribers_count']
            if 'full_address' in data:
                user.full_address = data['full_address']
            if 'phone' in data:
                user.phone = data['phone']
            if 'social_url' in data:
                user.social_url = data['social_url']
            if 'country' in data:
                user.country = data['country']
            if 'document_number' in data:
                user.document_number = data['document_number']
            if 'signature' in data:
                user.signature = data['signature']
        
        db.session.commit()
        
        log_action(session['user_id'], 'Edição de usuário', f'Editou dados do usuário {user.login}')
        
        return jsonify({
            'message': 'Usuário editado com sucesso',
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@tronos_bp.route('/admin/users/<int:user_id>/generate-password', methods=['POST'])
def generate_user_password(user_id):
    """Gerar nova senha aleatória para um usuário (apenas admin)"""
    try:
        if session.get('user_type') != 'admin':
            return jsonify({'error': 'Acesso negado'}), 403
        
        import random
        import string
        
        # Gerar senha aleatória de 8 caracteres
        characters = string.ascii_letters + string.digits
        new_password = ''.join(random.choice(characters) for _ in range(8))
        
        user = TronosUser.query.get_or_404(user_id)
        user.set_password(new_password)
        
        db.session.commit()
        
        log_action(session['user_id'], 'Geração de senha', f'Nova senha gerada para usuário {user.login}')
        
        return jsonify({
            'message': 'Nova senha gerada com sucesso',
            'new_password': new_password,
            'user_login': user.login
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@tronos_bp.route('/admin/users/<int:user_id>/login-as', methods=['POST'])
def login_as_user(user_id):
    """Fazer login como outro usuário (apenas admin)"""
    try:
        if session.get('user_type') != 'admin':
            return jsonify({'error': 'Acesso negado'}), 403
        
        user = TronosUser.query.get_or_404(user_id)
        
        if user.user_type == 'admin':
            return jsonify({'error': 'Não é possível fazer login como outro admin'}), 400
        
        # Salvar admin original na sessão
        session['original_admin_id'] = session['user_id']
        session['original_admin_login'] = session['user_login']
        
        # Fazer login como o usuário
        session['user_id'] = user.id
        session['user_login'] = user.login
        session['user_type'] = user.user_type
        session['user_name'] = user.full_name
        
        log_action(session['original_admin_id'], 'Login como usuário', f'Fez login como usuário {user.login}')
        
        return jsonify({
            'message': f'Logado como {user.full_name}',
            'redirect_url': '/panel.html',
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@tronos_bp.route('/admin/return-to-admin', methods=['POST'])
def return_to_admin():
    """Retornar ao login de admin original"""
    try:
        if 'original_admin_id' not in session:
            return jsonify({'error': 'Não há sessão de admin para retornar'}), 400
        
        # Restaurar sessão de admin
        admin_id = session['original_admin_id']
        admin_login = session['original_admin_login']
        
        session['user_id'] = admin_id
        session['user_login'] = admin_login
        session['user_type'] = 'admin'
        
        # Limpar dados temporários
        session.pop('original_admin_id', None)
        session.pop('original_admin_login', None)
        
        log_action(admin_id, 'Retorno ao admin', 'Retornou à sessão de administrador')
        
        return jsonify({
            'message': 'Retornado à sessão de administrador',
            'redirect_url': '/admin.html'
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ==================== ROTAS PARA SOLICITAÇÕES ARQUIVADAS ====================

@tronos_bp.route('/admin/archived-requests', methods=['GET'])
def get_archived_requests():
    """Obter solicitações arquivadas (aprovadas/rejeitadas)"""
    try:
        if session.get('user_type') != 'admin':
            return jsonify({'error': 'Acesso negado'}), 403
        
        # Buscar solicitações com status aprovado ou rejeitado
        archived_requests = RemovalRequest.query.filter(
            RemovalRequest.status.in_(['approved', 'rejected'])
        ).order_by(RemovalRequest.updated_at.desc()).all()
        
        requests_data = []
        for request in archived_requests:
            user = TronosUser.query.get(request.user_id)
            requests_data.append({
                'id': request.id,
                'requester_name': user.full_name if user else 'Usuário não encontrado',
                'user_login': user.login if user else 'N/A',
                'original_url': request.original_url,
                'original_title': request.original_title,
                'original_date': request.original_date,
                'removal_url': request.removal_url,
                'username': request.username,
                'status': request.status,
                'admin_notes': request.admin_notes,
                'created_at': request.created_at.isoformat(),
                'updated_at': request.updated_at.isoformat()
            })
        
        return jsonify({'requests': requests_data}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@tronos_bp.route('/admin/search-archived', methods=['GET'])
def search_archived_requests():
    """Buscar solicitações arquivadas por URL"""
    try:
        if session.get('user_type') != 'admin':
            return jsonify({'error': 'Acesso negado'}), 403
        
        url = request.args.get('url', '').strip()
        if not url:
            return jsonify({'error': 'URL é obrigatória'}), 400
        
        # Buscar por URL original ou URL de remoção
        archived_requests = RemovalRequest.query.filter(
            RemovalRequest.status.in_(['approved', 'rejected']),
            db.or_(
                RemovalRequest.original_url.like(f'%{url}%'),
                RemovalRequest.removal_url.like(f'%{url}%')
            )
        ).order_by(RemovalRequest.updated_at.desc()).all()
        
        if not archived_requests:
            return jsonify({
                'found': False,
                'message': 'Nenhuma solicitação arquivada encontrada para esta URL'
            }), 200
        
        requests_data = []
        for req in archived_requests:
            user = TronosUser.query.get(req.user_id)
            requests_data.append({
                'id': req.id,
                'requester_name': user.full_name if user else 'Usuário não encontrado',
                'user_login': user.login if user else 'N/A',
                'original_url': req.original_url,
                'original_title': req.original_title,
                'original_date': req.original_date,
                'removal_url': req.removal_url,
                'username': req.username,
                'status': req.status,
                'admin_notes': req.admin_notes,
                'created_at': req.created_at.isoformat(),
                'updated_at': req.updated_at.isoformat()
            })
        
        return jsonify({
            'found': True,
            'requests': requests_data
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@tronos_bp.route('/admin/requests/<int:request_id>/restore', methods=['POST'])
def restore_request(request_id):
    """Restaurar solicitação arquivada para status pendente"""
    try:
        if session.get('user_type') != 'admin':
            return jsonify({'error': 'Acesso negado'}), 403
        
        removal_request = RemovalRequest.query.get_or_404(request_id)
        
        # Verificar se está arquivada
        if removal_request.status not in ['approved', 'rejected']:
            return jsonify({'error': 'Apenas solicitações arquivadas podem ser restauradas'}), 400
        
        # Restaurar para pendente
        removal_request.status = 'pending'
        removal_request.admin_notes = (removal_request.admin_notes or '') + f'\n[RESTAURADA em {datetime.now().strftime("%d/%m/%Y %H:%M")}]'
        removal_request.updated_at = datetime.now()
        
        db.session.commit()
        
        log_action(session['user_id'], 'Restauração de solicitação', f'Solicitação {request_id} restaurada para pendente')
        
        return jsonify({'message': 'Solicitação restaurada com sucesso'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Modificar rota de solicitações de remoção para excluir arquivadas
@tronos_bp.route('/admin/removal-requests', methods=['GET'])
def get_removal_requests_active_only():
    """Obter apenas solicitações ativas (não arquivadas)"""
    try:
        if session.get('user_type') != 'admin':
            return jsonify({'error': 'Acesso negado'}), 403
        
        # Buscar apenas solicitações pendentes (não arquivadas)
        removal_requests = RemovalRequest.query.filter(
            RemovalRequest.status == 'pending'
        ).order_by(RemovalRequest.created_at.desc()).all()
        
        requests_data = []
        for request in removal_requests:
            user = TronosUser.query.get(request.user_id)
            requests_data.append({
                'id': request.id,
                'requester_name': user.full_name if user else 'Usuário não encontrado',
                'user_login': user.login if user else 'N/A',
                'original_url': request.original_url,
                'original_title': request.original_title,
                'original_date': request.original_date,
                'removal_url': request.removal_url,
                'username': request.username,
                'status': request.status,
                'admin_notes': request.admin_notes,
                'created_at': request.created_at.isoformat(),
                'updated_at': request.updated_at.isoformat()
            })
        
        return jsonify({'requests': requests_data}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

