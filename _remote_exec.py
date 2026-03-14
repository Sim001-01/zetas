import paramiko,sys,shlex 
HOST='152.53.138.74' 
USER='avvodesk' 
PASS='KFtGKFCyyEocD^#hmpjAmcDxymx1j3ZX#0y' 
cmd=' '.join(sys.argv[1:]) 
wrapped='bash -lc ' + shlex.quote(cmd) 
ssh=paramiko.SSHClient() 
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy()) 
ssh.connect(HOST,port=22,username=USER,password=PASS,timeout=20) 
stdin,stdout,stderr=ssh.exec_command(wrapped) 
out=stdout.read().decode('utf-8','ignore') 
err=stderr.read().decode('utf-8','ignore') 
sys.stdout.buffer.write(out.encode('utf-8','ignore'))
sys.stderr.buffer.write(err.encode('utf-8','ignore'))
rc=stdout.channel.recv_exit_status() 
ssh.close() 
sys.exit(rc)
